import { FalH3MaxVideoProvider } from "./providers/fal-h3-max";
import { MiniMaxVideoProvider } from "./providers/minimax";
import { MockVideoProvider } from "./providers/mock";
import type { GenerateVideoInput, GenerateVideoResult, VideoGenerationProvider } from "./types";

const providerFactories: Record<string, () => VideoGenerationProvider> = {
  mock: () => new MockVideoProvider(),
  "fal-h3-max": () => new FalH3MaxVideoProvider(),
  minimax: () => new MiniMaxVideoProvider(),
};

export class VideoGateway {
  constructor(private readonly provider: VideoGenerationProvider) {}
  getProviderName() { return this.provider.name; }
  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    return this.provider.generateVideo(input);
  }

  supportsQueue() {
    return Boolean(this.provider.submitVideo && this.provider.getVideoStatus);
  }

  submitVideo(input: GenerateVideoInput) {
    if (!this.provider.submitVideo) throw new Error(`${this.provider.name} does not support asynchronous queue submission.`);
    return this.provider.submitVideo(input);
  }

  getVideoStatus(providerTaskId: string) {
    if (!this.provider.getVideoStatus) throw new Error(`${this.provider.name} does not support asynchronous status checks.`);
    return this.provider.getVideoStatus(providerTaskId);
  }
}

export function getVideoGateway() {
  const name = process.env.VIDEO_PROVIDER ?? "mock";
  const factory = providerFactories[name];
  if (!factory) throw new Error(`Unsupported VIDEO_PROVIDER: ${name}`);
  return new VideoGateway(factory());
}
