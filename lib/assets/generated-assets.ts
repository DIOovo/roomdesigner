import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { downloadRemoteAsset } from "./remote-download";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type AssetKind = "after-frame" | "raw-video" | "watermarked-video";

export async function persistGeneratedAsset(input: { admin: AdminClient | null; sourceUrl: string; jobId: string; kind: AssetKind }) {
  if (!input.admin || input.sourceUrl.startsWith("/")) return { url: input.sourceUrl, path: null };
  const asset = await downloadRemoteAsset({
    url: input.sourceUrl,
    label: input.kind,
    allowedContentTypes: input.kind === "after-frame" ? ["image/jpeg", "image/png"] : ["video/mp4"],
    maxBytes: input.kind === "after-frame" ? 20 * 1024 * 1024 : 64 * 1024 * 1024,
  });
  const extension = input.kind === "after-frame" ? (asset.contentType === "image/png" ? "png" : "jpg") : "mp4";
  const path = `${input.jobId}/${input.kind}.${extension}`;
  const uploaded = await input.admin.storage.from("generation-results").upload(path, asset.bytes, { contentType: asset.contentType, upsert: true });
  if (uploaded.error) throw new Error(`The ${input.kind} asset could not be saved.`);
  const signed = await input.admin.storage.from("generation-results").createSignedUrl(path, 60 * 60);
  if (signed.error) throw new Error(`The ${input.kind} asset could not be signed.`);
  return { url: signed.data.signedUrl, path };
}

export async function resolveStoredAsset(admin: AdminClient | null, path: string | null | undefined, fallbackUrl: string | null | undefined) {
  if (!path || !admin) return fallbackUrl ?? null;
  const signed = await admin.storage.from("generation-results").createSignedUrl(path, 60 * 60);
  return signed.error ? fallbackUrl ?? null : signed.data.signedUrl;
}
