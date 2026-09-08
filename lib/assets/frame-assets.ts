import { fal } from "@fal-ai/client";
import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOwnedPendingInputPath, storagePathFromSignedImageUrl, validateRoomImageMetadata } from "./input-upload-validation";
import { downloadRemoteAsset } from "./remote-download";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export async function createInputUpload(input: {
  admin: AdminClient;
  contentType: "image/jpeg" | "image/png";
  ownerId: string;
}) {
  const extension = input.contentType === "image/png" ? "png" : "jpg";
  const path = `${input.ownerId}/pending/${crypto.randomUUID()}.${extension}`;
  const signed = await input.admin.storage.from("generation-inputs").createSignedUploadUrl(path, { upsert: false });
  if (signed.error) throw new Error("The room photo upload could not be prepared.");
  return { path, signedUrl: signed.data.signedUrl };
}

export async function signUploadedInput(input: { admin: AdminClient; path: string; ownerId: string }) {
  if (!isOwnedPendingInputPath(input.path, input.ownerId)) throw new Error("The uploaded room photo is not valid for this session.");
  await assertStoredInput(input.admin, input.path);
  const signed = await input.admin.storage.from("generation-inputs").createSignedUrl(input.path, 60 * 60);
  if (signed.error) throw new Error("The room photo could not be made available for generation.");
  return signed.data.signedUrl;
}

export async function resolveSubmittedInputFrame(input: {
  admin: AdminClient | null;
  imageUrl: string;
  ownerId: string;
}) {
  if (input.imageUrl.startsWith("/samples/") && !input.imageUrl.includes("..")) {
    return { url: absoluteUrl(input.imageUrl), path: null };
  }
  if (!input.admin) throw new Error("Supabase Storage is required for uploaded room photos.");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const path = supabaseUrl ? storagePathFromSignedImageUrl(input.imageUrl, supabaseUrl) : null;
  if (!path || !isOwnedPendingInputPath(path, input.ownerId)) throw new Error("Please upload the room photo again.");
  await assertStoredInput(input.admin, path);
  return { url: input.imageUrl, path };
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

async function assertStoredInput(admin: AdminClient, path: string) {
  const info = await admin.storage.from("generation-inputs").info(path);
  if (info.error || !info.data) throw new Error("The uploaded room photo could not be found.");
  const metadata = (info.data as { metadata?: { mimetype?: unknown; size?: unknown } }).metadata;
  const validation = validateRoomImageMetadata(metadata?.mimetype, Number(metadata?.size));
  if (validation) throw new Error(validation);
}
