import "server-only";
import { readBoundedAssetResponse } from "./response-limits";

export async function downloadRemoteAsset(input: {
  url: string;
  label: string;
  allowedContentTypes: readonly string[];
  maxBytes: number;
  timeoutMs?: number;
  init?: RequestInit;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);
  try {
    const response = await fetch(input.url, { ...input.init, signal: controller.signal, redirect: "follow" });
    return await readBoundedAssetResponse({ response, label: input.label, allowedContentTypes: input.allowedContentTypes, maxBytes: input.maxBytes });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`${input.label} download timed out.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
