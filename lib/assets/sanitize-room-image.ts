import sharp from "sharp";
import type { RoomImageContentType } from "./input-upload-validation";

export type SanitizedRoomImage = {
  bytes: Buffer;
  contentType: RoomImageContentType;
};

type PrivateImageStorage = {
  download(path: string): Promise<{ data: Blob | null; error: unknown }>;
  upload(path: string, bytes: Uint8Array, options: { contentType: string; cacheControl: string; upsert: boolean }): Promise<{ error: unknown }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
  remove(paths: string[]): Promise<unknown>;
};

/**
 * Re-encodes an uploaded room image without preserving embedded metadata.
 * rotate() first applies EXIF orientation to the pixels, so the output remains
 * upright after EXIF, GPS, XMP, IPTC, device and timestamp tags are dropped.
 */
export async function sanitizeRoomImage(
  input: Uint8Array,
  expectedContentType: RoomImageContentType,
): Promise<SanitizedRoomImage> {
  try {
    const image = sharp(input, { failOn: "warning", limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();
    const decodedContentType = contentTypeForFormat(metadata.format);

    if (!decodedContentType || decodedContentType !== expectedContentType) {
      throw new Error("unsupported or mismatched image format");
    }

    const oriented = image.rotate();
    const bytes = expectedContentType === "image/jpeg"
      ? await oriented.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
      : await oriented.png({ compressionLevel: 9 }).toBuffer();

    return { bytes, contentType: expectedContentType };
  } catch {
    throw new Error("The room photo could not be processed safely. Please upload it again.");
  }
}

export async function finalizeSanitizedRoomImage(input: {
  storage: PrivateImageStorage;
  path: string;
  inspect: () => Promise<RoomImageContentType>;
  verify: () => Promise<unknown>;
}) {
  try {
    const contentType = await input.inspect();
    const downloaded = await input.storage.download(input.path);
    if (downloaded.error || !downloaded.data) throw new Error("Upload could not be verified. Please upload the image again.");

    const sanitized = await sanitizeRoomImage(new Uint8Array(await downloaded.data.arrayBuffer()), contentType);
    const overwritten = await input.storage.upload(input.path, sanitized.bytes, {
      contentType: sanitized.contentType,
      cacheControl: "3600",
      upsert: true,
    });
    if (overwritten.error) throw new Error("The room photo could not be processed safely. Please upload it again.");

    await input.verify();
    const signed = await input.storage.createSignedUrl(input.path, 60 * 60);
    if (signed.error || !signed.data) throw new Error("The room photo could not be made available for generation.");
    return signed.data.signedUrl;
  } catch (error) {
    try {
      await input.storage.remove([input.path]);
    } catch {
      // Cleanup is best-effort; the original error is the safe user-facing result.
    }
    throw error;
  }
}

function contentTypeForFormat(format: string | undefined): RoomImageContentType | null {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  return null;
}
