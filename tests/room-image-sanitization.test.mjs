import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { finalizeSanitizedRoomImage, sanitizeRoomImage } from "../lib/assets/sanitize-room-image.ts";

test("JPEG metadata is removed while the decoded format remains JPEG", async () => {
  const source = await sharp({
    create: { width: 4, height: 3, channels: 3, background: { r: 80, g: 120, b: 160 } },
  })
    .jpeg()
    .withExifMerge({ IFD0: { Make: "Private camera", Model: "Private device" }, ExifIFD: { DateTimeOriginal: "2025:01:02 03:04:05" } })
    .toBuffer();

  assert.ok((await sharp(source).metadata()).exif, "fixture should contain EXIF before sanitization");
  const sanitized = await sanitizeRoomImage(source, "image/jpeg");
  const metadata = await sharp(sanitized.bytes).metadata();

  assert.equal(sanitized.contentType, "image/jpeg");
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.iptc, undefined);
});

test("EXIF orientation is applied to pixels and then removed", async () => {
  const source = await sharp({
    create: { width: 6, height: 4, channels: 3, background: { r: 180, g: 90, b: 30 } },
  }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const before = await sharp(source).metadata();
  assert.equal(before.orientation, 6);

  const sanitized = await sanitizeRoomImage(source, "image/jpeg");
  const after = await sharp(sanitized.bytes).metadata();
  assert.equal(after.width, 4);
  assert.equal(after.height, 6);
  assert.equal(after.orientation, undefined);
  assert.equal(after.exif, undefined);
});

test("PNG remains PNG and embedded metadata is removed", async () => {
  const source = await sharp({
    create: { width: 5, height: 3, channels: 4, background: { r: 20, g: 140, b: 90, alpha: 0.7 } },
  }).png().withExifMerge({ IFD0: { Make: "Private camera" } }).toBuffer();
  assert.ok((await sharp(source).metadata()).exif, "fixture should contain EXIF before sanitization");

  const sanitized = await sanitizeRoomImage(source, "image/png");
  const metadata = await sharp(sanitized.bytes).metadata();
  assert.equal(sanitized.contentType, "image/png");
  assert.equal(metadata.format, "png");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.iptc, undefined);
});

test("malformed, mismatched, and unsupported images fail closed", async () => {
  await assert.rejects(sanitizeRoomImage(new TextEncoder().encode("not an image"), "image/jpeg"), /processed safely/);
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(sanitizeRoomImage(png, "image/jpeg"), /processed safely/);
  const webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toBuffer();
  await assert.rejects(sanitizeRoomImage(webp, "image/jpeg"), /processed safely/);
});

test("upload finalization sanitizes and overwrites before creating a signed URL", async () => {
  const raw = await metadataJpeg();
  const calls = [];
  let stored = raw;
  const storage = fakeStorage({
    getStored: () => stored,
    setStored: (bytes) => { stored = Buffer.from(bytes); },
    calls,
  });

  const signedUrl = await finalizeSanitizedRoomImage({
    storage,
    path: TEST_PATH,
    inspect: async () => { calls.push("inspect"); return "image/jpeg"; },
    verify: async () => { calls.push("verify"); },
  });
  assert.equal(signedUrl, "https://storage.example/sanitized-room.jpg?token=safe");
  assert.deepEqual(calls, ["inspect", "download", "upload", "verify", "createSignedUrl"]);
  assert.equal((await sharp(stored).metadata()).exif, undefined);
  assert.ok(stored.length > 0);
  assert.equal(storage.lastUploadOptions.contentType, "image/jpeg");
  assert.equal(storage.lastUploadOptions.upsert, true);
});

test("sanitizer failure returns no signed URL and removes the raw upload", async () => {
  const calls = [];
  const raw = Buffer.from("malformed room image");
  const storage = fakeStorage({ getStored: () => raw, setStored: () => undefined, calls });

  await assert.rejects(
    finalizeSanitizedRoomImage({ storage, path: TEST_PATH, inspect: async () => "image/jpeg", verify: async () => undefined }),
    /processed safely/,
  );
  assert.deepEqual(calls, ["download", "remove"]);
  assert.equal(calls.includes("createSignedUrl"), false);
});

test("preflight validation failure also removes the unsanitized upload", async () => {
  const calls = [];
  const storage = fakeStorage({ getStored: () => Buffer.from("unsupported"), setStored: () => undefined, calls });
  await assert.rejects(
    finalizeSanitizedRoomImage({
      storage,
      path: TEST_PATH,
      inspect: async () => { calls.push("inspect"); throw new Error("Only PNG and JPG images are accepted."); },
      verify: async () => undefined,
    }),
    /Only PNG and JPG/,
  );
  assert.deepEqual(calls, ["inspect", "remove"]);
});

const TEST_PATH = "1cda71b2-1c31-46d7-b19f-180d577e8282/pending/991aa2c5-e217-49ba-941c-22d22084d143.jpg";

async function metadataJpeg() {
  return sharp({ create: { width: 8, height: 6, channels: 3, background: { r: 25, g: 75, b: 125 } } })
    .jpeg()
    .withExifMerge({ IFD0: { Make: "Private camera" } })
    .toBuffer();
}

function fakeStorage({ getStored, setStored, calls }) {
  const storage = {
    lastUploadOptions: null,
    async download() {
      calls.push("download");
      return { data: new Blob([getStored()], { type: "image/jpeg" }), error: null };
    },
    async upload(_path, bytes, options) {
      calls.push("upload");
      storage.lastUploadOptions = options;
      setStored(bytes);
      return { data: { path: TEST_PATH }, error: null };
    },
    async createSignedUrl() {
      calls.push("createSignedUrl");
      return { data: { signedUrl: "https://storage.example/sanitized-room.jpg?token=safe" }, error: null };
    },
    async remove(paths) {
      calls.push("remove");
      assert.deepEqual(paths, [TEST_PATH]);
      return { data: [], error: null };
    },
  };
  return storage;
}
