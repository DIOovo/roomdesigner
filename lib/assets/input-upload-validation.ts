export const MAX_ROOM_IMAGE_BYTES = 10 * 1024 * 1024;
export const ROOM_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export function validateRoomImageMetadata(contentType: unknown, size: unknown) {
  if (typeof contentType !== "string" || !ROOM_IMAGE_TYPES.includes(contentType as (typeof ROOM_IMAGE_TYPES)[number])) {
    return "Only PNG and JPG images are accepted.";
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) {
    return "The uploaded image is empty.";
  }
  if (size > MAX_ROOM_IMAGE_BYTES) return "The image must be 10MB or smaller.";
  return null;
}

export function storagePathFromSignedImageUrl(imageUrl: string, supabaseUrl: string) {
  try {
    const url = new URL(imageUrl);
    const base = new URL(supabaseUrl);
    if (url.origin !== base.origin || !url.searchParams.has("token")) return null;

    const basePath = base.pathname.replace(/\/$/, "");
    const prefix = `${basePath}/storage/v1/object/sign/generation-inputs/`;
    if (!url.pathname.startsWith(prefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path || path.includes("..") || path.includes("\\") || path.includes("\0")) return null;
    return path;
  } catch {
    return null;
  }
}

export function isOwnedPendingInputPath(path: string, ownerId: string) {
  const prefix = `${ownerId}/pending/`;
  if (!path.startsWith(prefix)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png)$/i.test(path.slice(prefix.length));
}
