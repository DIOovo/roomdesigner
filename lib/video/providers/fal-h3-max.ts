import { fal } from "@fal-ai/client";
import type { GenerateVideoInput, GenerateVideoResult, VideoGenerationProvider, VideoQueueStatus, VideoResolution } from "../types";

type FalH3Output = { video?: { url?: string } };

export class FalH3MaxVideoProvider implements VideoGenerationProvider {
  readonly name = "fal-h3-max";
  private readonly model = process.env.FAL_H3_MODEL ?? "minimax/h3-max/image-to-video";
  private readonly promptExpansion = process.env.FAL_H3_PROMPT_EXPANSION ?? "balanced";
  private readonly client: Pick<typeof fal, "config" | "subscribe" | "queue">;

  constructor(client: Pick<typeof fal, "config" | "subscribe" | "queue"> = fal) {
    this.client = client;
    const credentials = process.env.FAL_KEY;
    if (!credentials) throw new Error("FAL_KEY is required when VIDEO_PROVIDER=fal-h3-max.");
    this.client.config({ credentials });
  }

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const result = await this.client.subscribe(this.model, { input: this.mapInput(input), startTimeout: 30 });
    return this.mapResult(result.data as FalH3Output, result.requestId);
  }

  async submitVideo(input: GenerateVideoInput) {
    const result = await this.client.queue.submit(this.model, { input: this.mapInput(input), startTimeout: 30 });
    if (!result.request_id) throw new Error("fal did not return a request ID.");
    return { providerTaskId: result.request_id };
  }

  async getVideoStatus(providerTaskId: string): Promise<VideoQueueStatus> {
    try {
      const status = await this.client.queue.status(this.model, { requestId: providerTaskId, logs: false, abortSignal: AbortSignal.timeout(20_000) });
      if (status.status === "IN_QUEUE") return { status: "queued" };
      if (status.status === "IN_PROGRESS") return { status: "processing" };
      if (status.status !== "COMPLETED") return { status: "failed", error: "The video provider could not complete this generation." };
      const result = await this.client.queue.result(this.model, { requestId: providerTaskId, abortSignal: AbortSignal.timeout(20_000) });
      return { status: "completed", result: this.mapResult(result.data as FalH3Output, result.requestId) };
    } catch (error) {
      if (isRetryableFalError(error)) {
        return { status: "retryable", error: "The video provider is temporarily unavailable." };
      }
      return { status: "failed", error: "The video provider response was invalid." };
    }
  }

  private mapInput(input: GenerateVideoInput) {
    if (input.seconds !== 5) throw new Error("fal H3 Max requires a 5-second duration in the RoomFacelift real pipeline.");
    return {
      image_url: input.firstFrame,
      end_image_url: input.lastFrame,
      prompt: input.prompt,
      duration: 5,
      resolution: mapResolution(input.resolution),
      prompt_expansion_mode: this.promptExpansion,
      enable_safety_checker: true,
    };
  }

  private mapResult(data: FalH3Output, requestId: string): GenerateVideoResult {
    const videoUrl = data.video?.url;
    if (!videoUrl) throw new Error("fal H3 Max completed without a video URL.");
    return { videoUrl, provider: this.name, providerTaskId: requestId };
  }
}

export function isRetryableFalError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (["AbortError", "TimeoutError"].includes(error.name)) return true;
  if (error instanceof TypeError) return true;
  const status = "status" in error && typeof error.status === "number" ? error.status : null;
  return status === 408 || status === 409 || status === 425 || status === 429 || (status !== null && status >= 500);
}

export function mapResolution(resolution: VideoResolution): "480P" | "768P" {
  if (resolution === "480p") return "480P";
  if (resolution === "768p") return "768P";
  throw new Error(`fal H3 Max does not support ${resolution}. Use 480p or 768p.`);
}
