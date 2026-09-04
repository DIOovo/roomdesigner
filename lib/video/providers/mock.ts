import type { GenerateVideoInput, GenerateVideoResult, VideoGenerationProvider, VideoQueueStatus } from "../types";

export class MockVideoProvider implements VideoGenerationProvider {
  readonly name = "mock";

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    void input;
    return { videoUrl: "/videos/living-japandi.mp4", provider: this.name, providerTaskId: crypto.randomUUID() };
  }

  async submitVideo(_input: GenerateVideoInput) {
    void _input;
    return { providerTaskId: `mock-${crypto.randomUUID()}` };
  }

  async getVideoStatus(providerTaskId: string): Promise<VideoQueueStatus> {
    return { status: "completed", result: { videoUrl: "/videos/living-japandi.mp4", provider: this.name, providerTaskId } };
  }
}
