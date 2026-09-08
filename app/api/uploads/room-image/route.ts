import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANONYMOUS_COOKIE, anonymousStorageId, createAnonymousIdentity, readAnonymousIdentity } from "@/lib/auth/anonymous";
import { createInputUpload, signUploadedInput } from "@/lib/assets/frame-assets";
import { validateRoomImageMetadata } from "@/lib/assets/input-upload-validation";
import { readAnonymousUsage } from "@/lib/credits/anonymous";
import { getUserEntitlements } from "@/lib/entitlements/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const validation = validateRoomImageMetadata(body?.contentType, body?.size);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const owner = await getUploadOwner({ createAnonymous: true });
    if (owner.response) return owner.response;
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Photo uploads are temporarily unavailable." }, { status: 503 });

    const upload = await createInputUpload({ admin, contentType: body!.contentType as "image/jpeg" | "image/png", ownerId: owner.ownerId! });
    const response = NextResponse.json(upload);
    if (owner.anonymousToken) response.cookies.set(ANONYMOUS_COOKIE, owner.anonymousToken, cookieOptions());
    return response;
  } catch (error) {
    console.error("Room image upload preparation failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "The room photo upload could not be prepared. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request);
    if (!body || typeof body.path !== "string") return NextResponse.json({ error: "A valid uploaded image path is required." }, { status: 400 });
    const owner = await getUploadOwner({ createAnonymous: false });
    if (owner.response) return owner.response;
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Photo uploads are temporarily unavailable." }, { status: 503 });
    const imageUrl = await signUploadedInput({ admin, path: body.path, ownerId: owner.ownerId! });
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Room image upload completion failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "The room photo upload could not be completed." }, { status: 400 });
  }
}

async function getUploadOwner({ createAnonymous }: { createAnonymous: boolean }) {
  const serverClient = await getSupabaseServer();
  const user = serverClient ? (await serverClient.auth.getUser()).data.user : null;
  const store = await cookies();
  const anonymousCount = readAnonymousUsage(store.get("roomfacelift_free")?.value);
  if (!user && anonymousCount >= 1) return { response: authRequired(), ownerId: null, anonymousToken: undefined };
  if (user && (await getUserEntitlements(user.id)).totalCreditsRemaining <= 0) return { response: upgradeRequired(), ownerId: null, anonymousToken: undefined };
  if (user) return { response: null, ownerId: user.id, anonymousToken: undefined };

  const currentToken = store.get(ANONYMOUS_COOKIE)?.value;
  const currentIdentity = readAnonymousIdentity(currentToken);
  if (currentIdentity) return { response: null, ownerId: anonymousStorageId(currentIdentity), anonymousToken: undefined };
  if (!createAnonymous) return { response: NextResponse.json({ error: "The upload session expired. Please upload the photo again." }, { status: 401 }), ownerId: null, anonymousToken: undefined };
  const created = createAnonymousIdentity();
  return { response: null, ownerId: anonymousStorageId(created.id), anonymousToken: created.token };
}

async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  try {
    return await request.json() as { contentType?: unknown; size?: unknown; path?: unknown };
  } catch {
    return null;
  }
}

function authRequired() { return NextResponse.json({ error: "Sign in to use your second free preview.", requiresAuth: true }, { status: 401 }); }
function upgradeRequired() { return NextResponse.json({ error: "No generation credits remaining.", requiresUpgrade: true }, { status: 402 }); }
function cookieOptions() { return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" }; }
