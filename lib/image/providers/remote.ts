import type { AfterFrameProvider, GenerateAfterFrameInput } from "../types";
import { downloadRemoteAsset } from "@/lib/assets/remote-download";

export class RemoteAfterFrameProvider implements AfterFrameProvider {
  readonly name = "remote";
  async generate(input: GenerateAfterFrameInput) {
    const endpoint = process.env.AFTER_IMAGE_API_URL;
    if (!endpoint) throw new Error("AFTER_IMAGE_API_URL is required when AFTER_IMAGE_PROVIDER=remote.");
    const response = await downloadRemoteAsset({
      url: endpoint,
      label: "After-frame provider response",
      allowedContentTypes: ["application/json"],
      maxBytes: 1024 * 1024,
      timeoutMs: 30_000,
      init: { method: "POST", headers: { Authorization: `Bearer ${process.env.AFTER_IMAGE_API_KEY ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify(input) },
    });
    const data = JSON.parse(new TextDecoder().decode(response.bytes)) as { imageUrl?: string };
    if (!data.imageUrl || !isHttpUrl(data.imageUrl)) throw new Error("The after-frame provider could not create the redesigned room.");
    return { imageUrl: data.imageUrl, provider: this.name };
  }
}

function isHttpUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
