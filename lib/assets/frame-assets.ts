import { fal } from "@fal-ai/client";
import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { downloadRemoteAsset } from "./remote-download";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export async function persistInputFrame(input: {
  admin: AdminClient | null;
  file?: File;
  samplePath?: string;
  ownerId: string;
  jobId: string;
}) {
  if (!input.file) {
    if (!input.samplePath?.startsWith("/samples/")) throw new Error("A valid sample path is required.");
    return { url: absoluteUrl(input.samplePath), path: null };
  }
  if (!input.admin) {
    if ((process.env.VIDEO_PROVIDER ?? "mock") !== "mock") throw new Error("Supabase Storage is required for real uploaded frames.");
    return { url: absoluteUrl("/samples/living-before.jpg"), path: null };
  }
  const extension = input.file.type === "image/png" ? "png" : "jpg";
  const path = `${input.ownerId}/${input.jobId}/${crypto.randomUUID()}.${extension}`;
  const uploaded = await input.admin.storage.from("generation-inputs").upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploaded.error) throw new Error("The room photo could not be uploaded.");
  const signed = await input.admin.storage.from("generation-inputs").createSignedUrl(path, 60 * 60);
  if (signed.error) throw new Error("The room photo could not be signed.");
  return { url: signed.data.signedUrl, path };
}

export async function ensureFrameAccessibleToFal(url: string) {
  if ((process.env.VIDEO_PROVIDER ?? "mock") !== "fal-h3-max") return url;
  const parsed = new URL(url);
  if (!isLocalHost(parsed.hostname)) return url;
  const asset = await downloadRemoteAsset({ url, label: "Local frame", allowedContentTypes: ["image/jpeg", "image/png"], maxBytes: 10 * 1024 * 1024, timeoutMs: 20_000 });
  const file = new File([asset.bytes], `roomfacelift-frame.${asset.contentType === "image/png" ? "png" : "jpg"}`, { type: asset.contentType });
  return fal.storage.upload(file);
}

export async function resolveInputFrame(admin: AdminClient | null, path: string | null | undefined, fallbackUrl: string | null | undefined) {
  if (!path || !admin) return fallbackUrl ?? null;
  const signed = await admin.storage.from("generation-inputs").createSignedUrl(path, 60 * 60);
  return signed.error ? null : signed.data.signedUrl;
}

function absoluteUrl(path: string) { return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`; }
function isLocalHost(hostname: string) { return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"; }
