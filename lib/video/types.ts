export type VideoResolution = "480p" | "768p" | "720p" | "1080p";

export type GenerateVideoInput = {
  firstFrame: string;
  lastFrame: string;
  prompt: string;
  seconds: number;
  resolution: VideoResolution;
};

export type GenerateVideoResult = {
  videoUrl: string;
  provider: string;
  providerTaskId?: string;
};

export type VideoQueueStatus =
  | { status: "queued" | "processing" }
  | { status: "completed"; result: GenerateVideoResult }
  | { status: "failed"; error: string };

export interface VideoGenerationProvider {
  readonly name: string;
  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult>;
  submitVideo?(input: GenerateVideoInput): Promise<{ providerTaskId: string }>;
  getVideoStatus?(providerTaskId: string): Promise<VideoQueueStatus>;
}
