import { fal } from "@fal-ai/client";
import type { AfterFrameProvider, GenerateAfterFrameInput } from "../types";

type FalKontextOutput = { images?: Array<{ url?: string }> };

export function falKontextModel() {
  return process.env.AFTER_IMAGE_MODEL?.trim() || "fal-ai/flux-pro/kontext/max";
}

export class FalKontextAfterFrameProvider implements AfterFrameProvider {
  readonly name = "fal-kontext";
  readonly model = falKontextModel();

  constructor() {
    const credentials = process.env.FAL_KEY;
    if (!credentials) throw new Error("FAL_KEY is required when AFTER_IMAGE_PROVIDER=fal-kontext.");
    fal.config({ credentials });
  }

  async generate(input: GenerateAfterFrameInput) {
    const result = await fal.subscribe(this.model, { input: this.mapInput(input) });
    return this.mapResult(result.data as FalKontextOutput);
  }

  mapInput(input: GenerateAfterFrameInput) {
    return {
      image_url: input.firstFrame,
      prompt: input.prompt,
      num_images: 1,
      output_format: "jpeg",
      enhance_prompt: false,
    };
  }

  mapResult(data: FalKontextOutput) {
    const url = data.images?.[0]?.url;
    if (!url || !isHttpUrl(url)) throw new Error("The after-frame provider could not create the redesigned room.");
    return { imageUrl: url, provider: this.name };
  }
}

function isHttpUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }