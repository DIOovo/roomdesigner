export async function readBoundedAssetResponse(input: {
  response: Response;
  label: string;
  allowedContentTypes: readonly string[];
  maxBytes: number;
}) {
  const { response } = input;
  if (!response.ok) throw new Error(`${input.label} download failed.`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!input.allowedContentTypes.includes(contentType)) throw new Error(`${input.label} returned an unsupported content type.`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > input.maxBytes) throw new Error(`${input.label} exceeded the size limit.`);
  if (!response.body) throw new Error(`${input.label} returned an empty response.`);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > input.maxBytes) {
      await reader.cancel();
      throw new Error(`${input.label} exceeded the size limit.`);
    }
    chunks.push(value);
  }
  if (total === 0) throw new Error(`${input.label} returned an empty file.`);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { bytes, contentType };
}
