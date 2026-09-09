export const MAX_ROOM_IMAGE_BYTES = 10 * 1024 * 1024;
export const ROOM_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export type RoomImageContentType = (typeof ROOM_IMAGE_TYPES)[number];

export function resolveRoomImageContentType(file: { type?: string; name?: string }): RoomImageContentType | null {
  const declared = normalizeContentType(file.type);
  if (ROOM_IMAGE_TYPES.includes(declared as RoomImageContentType)) return declared as RoomImageContentType;
  if (declared) return null;
  const name = file.name?.toLowerCase() ?? "";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

export function validateRoomImageMetadata(contentType: unknown, size: unknown) {
  const sizeError = validateRoomImageSize(size);
  if (sizeError) return sizeError;
  if (typeof contentType !== "string" || !ROOM_IMAGE_TYPES.includes(normalizeContentType(contentType) as RoomImageContentType)) return "Only PNG and JPG images are accepted.";
  return null;
}

export function validateRoomImageSize(size: unknown) {
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) return "The uploaded image is empty.";
  if (size > MAX_ROOM_IMAGE_BYTES) return "The image must be 10MB or smaller.";
  return null;
}

export function normalizeContentType(value: unknown) {
  return typeof value === "string" ? value.split(";", 1)[0].trim().toLowerCase() : "";
}

export function isSupportedRoomImageContentType(value: unknown): value is RoomImageContentType {
  return ROOM_IMAGE_TYPES.includes(normalizeContentType(value) as RoomImageContentType);
}

export function needsMagicByteValidation(value: unknown) {
  const contentType = normalizeContentType(value);
  return !contentType || contentType === "application/octet-stream";
}

export function detectRoomImageContentType(bytes: Uint8Array): RoomImageContentType | null {
  const isPng = bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (isPng) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
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
