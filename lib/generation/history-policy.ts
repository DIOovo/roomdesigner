import type { DesignScope } from "./design-scope";
import type { GenerationJob, GenerationStatus } from "./types";

export type HistoryJob = Pick<GenerationJob,
  | "id"
  | "user_id"
  | "room_type"
  | "style"
  | "design_scope"
  | "status"
  | "stage"
  | "created_at"
  | "resolution"
  | "plan"
  | "credit_source"
  | "is_watermarked"
  | "first_frame_path"
  | "first_frame_url"
  | "last_frame_path"
  | "last_frame_url"
>;

export type PlayableJob = Pick<GenerationJob,
  | "is_watermarked"
  | "watermarked_video_path"
  | "watermarked_video_url"
  | "raw_video_path"
  | "raw_video_url"
  | "video_url"
>;

export type GenerationHistoryItem = {
  id: string;
  roomType: string;
  style: string;
  designScope: DesignScope | null;
  status: GenerationStatus;
  stage: string;
  createdAt: string;
  resolution: string;
  plan: string;
  creditSource: string | null;
  isWatermarked: boolean;
  thumbnailUrl: string | null;
};

export function isOwnedByUser(job: Pick<GenerationJob, "user_id">, userId: string) {
  return job.user_id === userId;
}

export function canReuseGeneration(job: Pick<GenerationJob, "user_id" | "status">, userId: string) {
  return isOwnedByUser(job, userId) && job.status === "completed";
}

export function playableAssetReference(job: PlayableJob) {
  if (job.is_watermarked) {
    return {
      path: job.watermarked_video_path,
      fallbackUrl: job.watermarked_video_path ? null : (job.watermarked_video_url ?? job.video_url),
    };
  }
  return {
    path: job.raw_video_path,
    fallbackUrl: job.raw_video_path ? null : (job.raw_video_url ?? job.video_url),
  };
}

export function toGenerationHistoryItem(job: HistoryJob, thumbnailUrl: string | null): GenerationHistoryItem {
  return {
    id: job.id,
    roomType: job.room_type,
    style: job.style,
    designScope: job.design_scope,
    status: job.status,
    stage: job.stage,
    createdAt: job.created_at,
    resolution: job.resolution,
    plan: job.plan,
    creditSource: job.credit_source,
    isWatermarked: job.is_watermarked,
    thumbnailUrl,
  };
}
