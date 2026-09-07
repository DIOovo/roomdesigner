import { downloadRemoteAsset } from "@/lib/assets/remote-download";

export async function applyFreeWatermark(videoUrl: string) {
  if ((process.env.VIDEO_PROVIDER ?? "mock") === "mock") return "/videos/living-japandi-watermarked.mp4";
  const endpoint = process.env.WATERMARK_SERVICE_URL;
  const token = process.env.WATERMARK_SERVICE_TOKEN;
  if (!endpoint || !token) throw new Error("Free exports require WATERMARK_SERVICE_URL and WATERMARK_SERVICE_TOKEN so the watermark is baked into the downloaded file.");
  const response = await downloadRemoteAsset({
    url: endpoint,
    label: "Watermark service response",
    allowedContentTypes: ["application/json"],
    maxBytes: 1024 * 1024,
    timeoutMs: 30_000,
    init: { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl, text: "Made with RoomFacelift", position: "bottom-right" }) },
  });
  const data = JSON.parse(new TextDecoder().decode(response.bytes)) as { videoUrl?: string };
  if (!data.videoUrl || !isHttpUrl(data.videoUrl)) throw new Error("The watermark service could not produce a protected export.");
  return data.videoUrl;
}

function isHttpUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
