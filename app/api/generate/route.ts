import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, createAnonymousIdentity, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { resolveSubmittedInputFrame } from "@/lib/assets/frame-assets";
import { claimAnonymousUsage } from "@/lib/credits/claim-anonymous";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { releaseGenerationCredit, reserveGenerationCredit } from "@/lib/credits/reservations";
import { assertGenerationConfiguration, GenerationConfigurationError } from "@/lib/config/generation";
import { getUserEntitlements } from "@/lib/entitlements/server";
import { createMockJobToken, MOCK_JOB_COOKIE } from "@/lib/generation/mock-job";
import { parseRequestedDesignScope, type DesignScope } from "@/lib/generation/design-scope";
import { getJobByRequestKey } from "@/lib/generation/repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Generation requests must use JSON." }, { status: 415 });
    }
    const body = await request.json() as { imageUrl?: unknown; roomType?: unknown; style?: unknown; scope?: unknown };
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const roomType = typeof body.roomType === "string" ? body.roomType : "Living Room";
    const style = typeof body.style === "string" ? body.style : "Japandi";
    const designScope = parseRequestedDesignScope(body.scope);
    const clientRequestId = request.headers.get("idempotency-key") ?? "";
    if (!designScope) return NextResponse.json({ error: "Choose a valid design scope." }, { status: 400 });
    const validation = validateInput(imageUrl, clientRequestId);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const serverClient = await getSupabaseServer();
    const user = serverClient ? (await serverClient.auth.getUser()).data.user : null;
    const store = await cookies();
    const anonymousCount = readAnonymousUsage(store.get("roomfacelift_free")?.value);
    if (!user && anonymousCount >= 1) return authRequired();

    let anonymousToken = store.get(ANONYMOUS_COOKIE)?.value;
    let anonymousIdentity = readAnonymousIdentity(anonymousToken);
    if (!user && !anonymousIdentity) {
      const created = createAnonymousIdentity();
      anonymousIdentity = created.id;
      anonymousToken = created.token;
    }
    const anonymousId = anonymousIdentity ? anonymousStorageId(anonymousIdentity) : null;
    const ownerId = user?.id ?? anonymousId!;
    const requestKey = createHash("sha256").update(`${ownerId}:${clientRequestId}`).digest("hex");
    const isMock = (process.env.VIDEO_PROVIDER ?? "mock") === "mock";
    assertGenerationConfiguration();
    const admin = getSupabaseAdmin();

    if (!admin) {
      if (!isMock) return NextResponse.json({ error: "Supabase must be configured before real generation can start." }, { status: 503 });
      if (!imageUrl.startsWith("/samples/")) return NextResponse.json({ error: "Photo uploads require Supabase Storage." }, { status: 503 });
      return createStatelessMockJob({ roomType, style, designScope, imageUrl, anonymousToken });
    }

    const existing = await getJobByRequestKey(requestKey);
    if (existing) return NextResponse.json({ jobId: existing.id, status: existing.status, stage: existing.stage, creditSource: existing.credit_source });

    if (user && anonymousId) await claimAnonymousUsage({ userId: user.id, anonymousId, cookieUsed: anonymousCount });
    if (user && (await getUserEntitlements(user.id)).totalCreditsRemaining <= 0) return upgradeRequired();

    const jobId = crypto.randomUUID();
    const firstFrame = await resolveSubmittedInputFrame({ admin, imageUrl, ownerId });
    const inserted = await admin.from("generation_jobs").insert({
      id: jobId,
      user_id: user?.id ?? null,
      anonymous_id: user ? null : anonymousId,
      request_key: requestKey,
      status: "queued",
      stage: "queued",
      room_type: roomType,
      style,
      design_scope: designScope,
      plan: "free",
      seconds: isMock ? 3 : 5,
      resolution: "480p",
      is_watermarked: true,
      commercial_license: false,
      priority_queue: false,
      first_frame_url: firstFrame.path ? null : firstFrame.url,
      first_frame_path: firstFrame.path,
      provider: process.env.VIDEO_PROVIDER ?? "mock",
    });
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const duplicate = await getJobByRequestKey(requestKey);
        if (duplicate) return NextResponse.json({ jobId: duplicate.id, status: duplicate.status, stage: duplicate.stage, creditSource: duplicate.credit_source });
        if (!user) {
          const active = await admin.from("generation_jobs").select("id,status,stage,credit_source").eq("anonymous_id", anonymousId).in("status", ["queued", "processing"]).maybeSingle();
          if (active.data) return NextResponse.json({ jobId: active.data.id, status: active.data.status, stage: active.data.stage, creditSource: active.data.credit_source });
        }
      }
      throw new Error("The generation job could not be created.");
    }

    const reservation = await reserveGenerationCredit({ jobId, userId: user?.id, anonymousId: user ? undefined : anonymousId! });
    if (!reservation.success) {
      await admin.from("generation_jobs").delete().eq("id", jobId);
      if (firstFrame.path) await admin.storage.from("generation-inputs").remove([firstFrame.path]);
      return reservation.errorCode === "requires_auth" ? authRequired() : upgradeRequired();
    }
    try {
      assertGenerationConfiguration({ watermarkRequired: reservation.isWatermarked });
    } catch (error) {
      await releaseGenerationCredit(jobId);
      await admin.from("generation_jobs").delete().eq("id", jobId);
      if (firstFrame.path) await admin.storage.from("generation-inputs").remove([firstFrame.path]);
      throw error;
    }

    const response = NextResponse.json({ jobId, status: "queued", stage: "queued", creditSource: reservation.creditSource, plan: reservation.plan }, { status: 202 });
    if (anonymousToken) response.cookies.set(ANONYMOUS_COOKIE, anonymousToken, cookieOptions(60 * 60 * 24 * 365));
    return response;
  } catch (error) {
    console.error("Generation job creation failed", { reason: error instanceof Error ? error.name : "unknown" });
    if (error instanceof GenerationConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: "The generation job could not be created. Please try again." }, { status: 500 });
  }
}

function createStatelessMockJob(input: { roomType: string; style: string; designScope: DesignScope; imageUrl: string; anonymousToken?: string }) {
  const jobId = crypto.randomUUID();
  const firstFrame = input.imageUrl || "/samples/living-before.jpg";
  const response = NextResponse.json({ jobId, status: "queued", stage: "queued", creditSource: "free", plan: "free" }, { status: 202 });
  response.cookies.set(MOCK_JOB_COOKIE, createMockJobToken({ id: jobId, createdAt: Date.now(), roomType: input.roomType, style: input.style, designScope: input.designScope, firstFrame, lastFrame: mockAfterPath(input.roomType) }), cookieOptions(60 * 30));
  if (input.anonymousToken) response.cookies.set(ANONYMOUS_COOKIE, input.anonymousToken, cookieOptions(60 * 60 * 24 * 365));
  return response;
}

function authRequired() { return NextResponse.json({ error: "Sign in to use your second free preview.", requiresAuth: true }, { status: 401 }); }
function upgradeRequired() { return NextResponse.json({ error: "No generation credits remaining.", requiresUpgrade: true }, { status: 402 }); }

function validateInput(imageUrl: string, requestId: string) {
  if (!requestId || requestId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(requestId)) return "A valid client request ID is required.";
  if (!imageUrl || imageUrl.length > 4096 || imageUrl.startsWith("data:") || imageUrl.includes("base64,")) return "Please upload a room photo or choose a valid sample.";
  if (imageUrl.startsWith("/samples/") && imageUrl.includes("..")) return "Please choose a valid sample.";
  return null;
}

function mockAfterPath(roomType: string) {
  const room = roomType.toLowerCase();
  if (room.includes("bed")) return "/samples/bedroom-after.jpg";
  if (room.includes("kitchen")) return "/samples/kitchen-after.jpg";
  if (room.includes("office") || room.includes("study")) return "/samples/office-after.jpg";
  return "/samples/living-after.jpg";
}

function cookieOptions(maxAge: number) { return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge, path: "/" }; }
