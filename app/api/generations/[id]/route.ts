import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureFrameAccessibleToFal, resolveInputFrame } from "@/lib/assets/frame-assets";
import { persistGeneratedAsset, resolveStoredAsset } from "@/lib/assets/generated-assets";
import { signAnonymousUsage } from "@/lib/credits/anonymous";
import { commitGenerationCredit, releaseGenerationCredit } from "@/lib/credits/reservations";
import { canAccessJob, getViewerIdentity } from "@/lib/generation/access";
import { normalizeStoredDesignScope } from "@/lib/generation/design-scope";
import { playableAssetReference } from "@/lib/generation/history-policy";
import { MOCK_JOB_COOKIE, mockJobState, readMockJobToken } from "@/lib/generation/mock-job";
import { claimStage, failJob, getJob, updateJob } from "@/lib/generation/repository";
import type { GenerationJob } from "@/lib/generation/types";
import { generateAfterFrame } from "@/lib/image/gateway";
import { buildRoomRedesignPrompt } from "@/lib/prompts/room-redesign";
import { buildRoomTransitionPrompt } from "@/lib/prompts/room-transition";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getVideoGateway } from "@/lib/video/gateway";
import { applyFreeWatermark } from "@/lib/video/watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getSupabaseAdmin();
  if (!admin) return mockStatus(id);
  const viewer = await getViewerIdentity();
  let job = await getJob(id);
  if (!job || !canAccessJob(job, viewer)) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  try {
    await advanceJob(job);
    job = (await getJob(id)) ?? job;
    if (job.status === "completed") await commitGenerationCredit(id);
  } catch (error) {
    console.error("Generation pipeline stage failed", { jobId: id, stage: job.stage, reason: error instanceof Error ? error.name : "unknown" });
    await failJob(id, job.stage);
    await releaseGenerationCredit(id);
    job = (await getJob(id)) ?? job;
  }

  const response = NextResponse.json(await publicJob(job, admin));
  if (!job.user_id && job.status === "completed") response.cookies.set("roomfacelift_free", signAnonymousUsage(1), cookieOptions());
  if (!job.user_id && job.status === "failed") response.cookies.set("roomfacelift_free", signAnonymousUsage(0), cookieOptions());
  return response;
}

async function advanceJob(job: GenerationJob): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || job.status === "completed" || job.status === "failed") return;
  if (job.stage === "video_submission_in_progress" && job.provider_task_id) {
    await updateJob(job.id, { stage: "generating_video" });
    return;
  }
  if (job.stage === "persisting_video") {
    if (!stageIsOlderThan(job, 90_000)) return;
    const recovered = await claimStage(job.id, "persisting_video", "generating_video");
    if (recovered) console.warn("Recovering interrupted video persistence", { jobId: job.id, providerTaskId: job.provider_task_id, recoveryStage: "generating_video" });
    return;
  }
  if (isStuck(job)) throw new Error("stalled generation stage");

  if (job.stage === "queued") {
    if (!await claimStage(job.id, "queued", "generating_after_frame")) return;
    const firstFrame = await resolveInputFrame(admin, job.first_frame_path, job.first_frame_url);
    if (!firstFrame) throw new Error("missing first frame");
    const after = await generateAfterFrame({ firstFrame, roomType: job.room_type, style: job.style, prompt: buildRoomRedesignPrompt(job.room_type, job.style, normalizeStoredDesignScope(job.design_scope)) });
    const persisted = await persistGeneratedAsset({ admin, sourceUrl: after.imageUrl, jobId: job.id, kind: "after-frame" });
    await updateJob(job.id, { last_frame_url: persisted.path ? null : persisted.url, last_frame_path: persisted.path, stage: "submitting_video" });
    return;
  }

  if (job.stage === "submitting_video") {
    if (!await claimStage(job.id, "submitting_video", "video_submission_in_progress")) return;
    const storedFirstFrame = await resolveInputFrame(admin, job.first_frame_path, job.first_frame_url);
    const storedLastFrame = await resolveStoredAsset(admin, job.last_frame_path, job.last_frame_url);
    if (!storedFirstFrame || !storedLastFrame) throw new Error("missing video frames");
    const gateway = getVideoGateway();
    const firstFrame = await ensureFrameAccessibleToFal(storedFirstFrame);
    const lastFrame = await ensureFrameAccessibleToFal(storedLastFrame);
    const input = { firstFrame, lastFrame, prompt: buildRoomTransitionPrompt(job.room_type, job.style), seconds: job.seconds, resolution: job.resolution } as const;
    if (gateway.supportsQueue()) {
      const submitted = await gateway.submitVideo(input);
      await updateJob(job.id, { stage: "generating_video", provider: gateway.getProviderName(), provider_task_id: submitted.providerTaskId });
    } else {
      const result = await gateway.generateVideo(input);
      const persisted = await persistGeneratedAsset({ admin, sourceUrl: result.videoUrl, jobId: job.id, kind: "raw-video" });
      await updateJob(job.id, { stage: "applying_watermark", provider: result.provider, provider_task_id: result.providerTaskId, raw_video_url: persisted.path ? null : persisted.url, raw_video_path: persisted.path });
    }
    return;
  }

  if (job.stage === "generating_video") {
    if (!job.provider_task_id) throw new Error("missing provider task");
    const state = await getVideoGateway().getVideoStatus(job.provider_task_id);
    console.info("Generation provider status", { jobId: job.id, providerTaskId: job.provider_task_id, providerStatus: state.status, recoveryStage: job.stage });
    if (state.status === "retryable") {
      console.warn("Generation provider status temporarily unavailable", { jobId: job.id, providerTaskId: job.provider_task_id, providerStatus: state.status, recoveryStage: job.stage });
      return;
    }
    if (state.status === "failed") throw new Error("provider generation failed");
    if (state.status !== "completed") return;
    if (!await claimStage(job.id, "generating_video", "persisting_video")) return;
    console.info("Generation provider result retrieved", { jobId: job.id, providerTaskId: job.provider_task_id, providerStatus: state.status, resultRetrieved: true, recoveryStage: "persisting_video" });
    try {
      const persisted = await persistGeneratedAsset({ admin, sourceUrl: state.result.videoUrl, jobId: job.id, kind: "raw-video" });
      await updateJob(job.id, { stage: "applying_watermark", raw_video_url: persisted.path ? null : persisted.url, raw_video_path: persisted.path, provider: state.result.provider, provider_task_id: state.result.providerTaskId });
      console.info("Generation video persisted", { jobId: job.id, providerTaskId: job.provider_task_id, resultRetrieved: true, postProcessingStage: "applying_watermark" });
    } catch (error) {
      if (isPermanentVideoPersistenceError(error)) throw error;
      console.warn("Generation video persistence will retry", { jobId: job.id, providerTaskId: job.provider_task_id, reason: error instanceof Error ? error.name : "unknown", recoveryStage: "generating_video" });
      await updateJob(job.id, { stage: "generating_video" });
    }
    return;
  }

  if (job.stage === "applying_watermark") {
    if (!await claimStage(job.id, "applying_watermark", "watermarking")) return;
    const rawVideoUrl = await resolveStoredAsset(admin, job.raw_video_path, job.raw_video_path ? null : job.raw_video_url);
    if (!rawVideoUrl) throw new Error("missing raw video");
    if (job.is_watermarked) {
      const protectedUrl = await applyFreeWatermark(rawVideoUrl);
      const persisted = await persistGeneratedAsset({ admin, sourceUrl: protectedUrl, jobId: job.id, kind: "watermarked-video" });
      const storedUrl = persisted.path ? null : persisted.url;
      await updateJob(job.id, { status: "completed", stage: "completed", watermarked_video_url: storedUrl, watermarked_video_path: persisted.path, video_url: storedUrl, completed_at: new Date().toISOString() });
    } else {
      await updateJob(job.id, { status: "completed", stage: "completed", video_url: job.raw_video_path ? null : rawVideoUrl, completed_at: new Date().toISOString() });
    }
    return;
  }

  return;
}

function isStuck(job: GenerationJob) {
  if (["generating_after_frame", "video_submission_in_progress", "watermarking"].includes(job.stage)) return stageIsOlderThan(job, 5 * 60 * 1000);
  return false;
}

function stageIsOlderThan(job: GenerationJob, milliseconds: number) {
  return Date.now() - new Date(job.updated_at).getTime() > milliseconds;
}

function isPermanentVideoPersistenceError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("unsupported content type") || error.message.includes("exceeded the size limit");
}

async function publicJob(job: GenerationJob, admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const asset = playableAssetReference(job);
  const videoUrl = job.status === "completed"
    ? await resolveStoredAsset(admin, asset.path, asset.fallbackUrl)
    : null;
  return { jobId: job.id, status: job.status, stage: job.stage, message: stageMessage(job.stage, job.error), videoUrl, resultUrl: job.status === "completed" ? `/result/${job.id}` : undefined, error: job.status === "failed" ? job.error : undefined };
}

async function mockStatus(id: string) {
  const store = await cookies();
  const claims = readMockJobToken(store.get(MOCK_JOB_COOKIE)?.value);
  if (!claims || claims.id !== id) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
  const state = mockJobState(claims);
  const response = NextResponse.json({ jobId: id, ...state, message: stageMessage(state.stage), videoUrl: state.status === "completed" ? "/videos/living-japandi-watermarked.mp4" : undefined, resultUrl: state.status === "completed" ? `/result/${id}` : undefined });
  if (state.status === "completed") response.cookies.set("roomfacelift_free", signAnonymousUsage(1), cookieOptions());
  return response;
}

function stageMessage(stage: string, error?: string | null) {
  const messages: Record<string, string> = { queued: "Preparing your room...", generating_after_frame: "Designing the new interior...", submitting_video: "Preparing your transformation...", video_submission_in_progress: "Preparing your transformation...", generating_video: "Creating your transformation...", persisting_video: "Saving your transformation...", applying_watermark: "Finishing your video...", watermarking: "Finishing your video...", completed: "Your room transformation is ready.", failed: error ?? "Generation failed. Please try again." };
  return messages[stage] ?? "Preparing your room...";
}

function cookieOptions() { return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" }; }
