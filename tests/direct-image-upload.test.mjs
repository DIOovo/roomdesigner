import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_ROOM_IMAGE_BYTES,
  isOwnedPendingInputPath,
  storagePathFromSignedImageUrl,
  validateRoomImageMetadata,
} from "../lib/assets/input-upload-validation.ts";
import { ApiResponseError, readApiResponse } from "../lib/http/client-response.ts";

test("current 10MB policy accepts representative production upload sizes", () => {
  for (const size of [500 * 1024, 3 * 1024 * 1024, 5 * 1024 * 1024, 8 * 1024 * 1024]) {
    assert.equal(validateRoomImageMetadata("image/jpeg", size), null);
  }
  assert.equal(validateRoomImageMetadata("image/png", MAX_ROOM_IMAGE_BYTES), null);
  assert.match(validateRoomImageMetadata("image/jpeg", MAX_ROOM_IMAGE_BYTES + 1), /10MB/);
  assert.match(validateRoomImageMetadata("image/webp", 500 * 1024), /PNG and JPG/);
});

test("signed input URLs resolve only to owned pending paths", () => {
  const owner = "1cda71b2-1c31-46d7-b19f-180d577e8282";
  const path = `${owner}/pending/991aa2c5-e217-49ba-941c-22d22084d143.jpg`;
  const url = `https://project.supabase.co/storage/v1/object/sign/generation-inputs/${path}?token=signed`;
  assert.equal(storagePathFromSignedImageUrl(url, "https://project.supabase.co"), path);
  assert.equal(isOwnedPendingInputPath(path, owner), true);
  assert.equal(isOwnedPendingInputPath(path, "another-user"), false);
  assert.equal(storagePathFromSignedImageUrl(url.replace("project.supabase.co", "attacker.example"), "https://project.supabase.co"), null);
});

test("generator uploads to Storage first and sends only a lightweight JSON generation payload", () => {
  const generator = source("components/generator/room-generator.tsx");
  const generateRoute = source("app/api/generate/route.ts");
  const uploadRoute = source("app/api/uploads/room-image/route.ts");

  assert.match(generator, /fetch\(prepared\.signedUrl/);
  assert.match(generator, /JSON\.stringify\(\{ imageUrl, roomType: room, style, scope: designScope \}\)/);
  assert.doesNotMatch(generator, /body\.append\("image"|readAsDataURL|data:image/);
  assert.match(generateRoute, /await request\.json\(\)/);
  assert.doesNotMatch(generateRoute, /request\.formData\(\)|form\.get\("image"\)|instanceof File/);
  assert.match(generateRoute, /imageUrl\.startsWith\("data:"\)|imageUrl\.includes\("base64,"\)/);
  assert.match(uploadRoute, /createInputUpload/);
  assert.match(uploadRoute, /signUploadedInput/);

  const payload = JSON.stringify({
    imageUrl: "https://project.supabase.co/storage/v1/object/sign/generation-inputs/owner/pending/photo.jpg?token=short-lived-signature",
    roomType: "Living Room",
    style: "Japandi",
    scope: "keep-layout",
  });
  assert.ok(Buffer.byteLength(payload) < 1024, "generation JSON should stay well below platform body limits");
  assert.doesNotMatch(payload, /base64|data:image/);
});

test("non-JSON and 413 responses produce safe user-facing errors", async () => {
  await assert.rejects(
    readApiResponse(new Response("Request Entity Too Large", { status: 413, headers: { "content-type": "text/plain" } }), "Generation could not start."),
    (error) => error instanceof ApiResponseError && error.status === 413 && /under 10MB/.test(error.message) && !/Request Entity/.test(error.message),
  );
  await assert.rejects(
    readApiResponse(new Response("<html>private stack trace</html>", { status: 500, headers: { "content-type": "text/html" } }), "Generation could not start."),
    (error) => error instanceof ApiResponseError && error.message === "Generation could not start." && !/stack trace/.test(error.message),
  );
  assert.deepEqual(
    await readApiResponse(new Response(JSON.stringify({ jobId: "job-1" }), { status: 202, headers: { "content-type": "application/json" } }), "Generation could not start."),
    { jobId: "job-1" },
  );
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
