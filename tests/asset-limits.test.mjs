import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedAssetResponse } from "../lib/assets/response-limits.ts";

test("accepts an allowed asset below the byte limit", async () => {
  const value = await readBoundedAssetResponse({ response: new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "video/mp4" } }), label: "video", allowedContentTypes: ["video/mp4"], maxBytes: 3 });
  assert.deepEqual([...value.bytes], [1, 2, 3]);
});

test("rejects unsupported content types", async () => {
  await assert.rejects(() => readBoundedAssetResponse({ response: new Response("html", { headers: { "content-type": "text/html" } }), label: "video", allowedContentTypes: ["video/mp4"], maxBytes: 100 }), /unsupported content type/);
});

test("enforces the streamed byte limit without Content-Length", async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); controller.enqueue(new Uint8Array([4, 5])); controller.close(); } });
  await assert.rejects(() => readBoundedAssetResponse({ response: new Response(stream, { headers: { "content-type": "video/mp4" } }), label: "video", allowedContentTypes: ["video/mp4"], maxBytes: 4 }), /size limit/);
});
