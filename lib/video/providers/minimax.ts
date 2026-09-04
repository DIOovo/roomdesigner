import type { GenerateVideoInput, GenerateVideoResult, VideoGenerationProvider } from "../types";

type CreateResponse = { task_id?: string; taskId?: string; base_resp?: { status_code?: number; status_msg?: string } };
type QueryResponse = { status?: string; file_id?: string; fileId?: string; video_url?: string; base_resp?: { status_msg?: string } };

export class MiniMaxVideoProvider implements VideoGenerationProvider {
  readonly name = "minimax";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = requireEnv("MINIMAX_API_KEY");
    this.baseUrl = process.env.MINIMAX_API_BASE_URL ?? "https://api.minimax.io/v1";
    this.model = process.env.MINIMAX_MODEL ?? "MiniMax-Hailuo-2.3";
  }

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const create = await this.request<CreateResponse>("/video_generation", {
      method: "POST",
      body: JSON.stringify({
        model: this.model,
        prompt: input.prompt,
        first_frame_image: input.firstFrame,
        last_frame_image: input.lastFrame,
        duration: input.seconds,
        resolution: input.resolution.toUpperCase(),
        prompt_optimizer: true,
      }),
    });
    const taskId = create.task_id ?? create.taskId;
    if (!taskId) throw new Error(create.base_resp?.status_msg ?? "MiniMax did not return a task ID.");

    const deadline = Date.now() + 170_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      const query = await this.request<QueryResponse>(`/query/video_generation?task_id=${encodeURIComponent(taskId)}`, { method: "GET" });
      if (query.status === "Fail") throw new Error(query.base_resp?.status_msg ?? "MiniMax video generation failed.");
      if (query.status === "Success") {
        if (query.video_url) return { videoUrl: query.video_url, provider: this.name, providerTaskId: taskId };
        const fileId = query.file_id ?? query.fileId;
        if (!fileId) throw new Error("MiniMax completed without a video file ID.");
        const file = await this.request<{ file?: { download_url?: string }; download_url?: string }>(`/files/retrieve?file_id=${encodeURIComponent(fileId)}`, { method: "GET" });
        const videoUrl = file.file?.download_url ?? file.download_url;
        if (!videoUrl) throw new Error("MiniMax completed without a downloadable video URL.");
        return { videoUrl, provider: this.name, providerTaskId: taskId };
      }
    }
    throw new Error("Video generation exceeded the 3-minute processing window.");
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...init.headers },
    });
    const data = (await response.json()) as T;
    if (!response.ok) throw new Error(`MiniMax request failed with status ${response.status}.`);
    return data;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when VIDEO_PROVIDER=minimax.`);
  return value;
}
