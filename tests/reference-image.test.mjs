import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isOwnedReferencePendingInputPath, validateRoomImageMetadata } from "../lib/assets/input-upload-validation.ts";
import { buildRoomRedesignPrompt } from "../lib/prompts/room-redesign.ts";

test("reference upload accepts PNG/JPEG within the existing 10MB policy and rejects invalid MIME", () => {
  assert.equal(validateRoomImageMetadata("image/png", 1024), null);
  assert.equal(validateRoomImageMetadata("image/jpeg", 1024), null);
  assert.match(validateRoomImageMetadata("image/webp", 1024), /PNG and JPG/);
  assert.match(validateRoomImageMetadata("image/gif", 1024), /PNG and JPG/);
  assert.match(validateRoomImageMetadata("image/png", 10 * 1024 * 1024 + 1), /10MB/);
});

test("reference paths are owner-bound and separate from primary room uploads", () => {
  const owner = "1cda71b2-1c31-46d7-b19f-180d577e8282";
  const file = "991aa2c5-e217-49ba-941c-22d22084d143.jpg";
  assert.equal(isOwnedReferencePendingInputPath(`${owner}/reference-pending/${file}`, owner), true);
  assert.equal(isOwnedReferencePendingInputPath(`${owner}/pending/${file}`, owner), false);
  assert.equal(isOwnedReferencePendingInputPath(`${owner}/reference-pending/${file}`, "another-user"), false);
});

test("no-reference prompt remains byte-for-byte unchanged", () => {
  const existing = buildRoomRedesignPrompt("Living Room", "Japandi", "keep-layout");
  const explicitlyAbsent = buildRoomRedesignPrompt("Living Room", "Japandi", "keep-layout", { hasReferenceImage: false });
  assert.equal(explicitlyAbsent, existing);
  assert.doesNotMatch(existing, /style reference only|Two input images/);
});

test("reference prompt treats room as geometry source and reference as style source", () => {
  for (const scope of ["keep-layout", "reimagine-space"]) {
    const prompt = buildRoomRedesignPrompt("Living Room", "Modern", scope, { hasReferenceImage: true });
    assert.match(prompt, /image 1 is the user's room and is the only source of room identity, geometry, architecture, viewpoint, composition, and spatial layout/i);
    assert.match(prompt, /image 2 is a style reference only/i);
    assert.match(prompt, /color palette, materials and finishes, furniture design language, decor style, lighting mood/i);
    assert.match(prompt, /Never copy image 2's room geometry, floor plan, walls, openings, camera angle, composition, object positions, or room identity/i);
    assert.match(prompt, /same camera viewpoint/i);
    assert.ok(prompt.indexOf("same camera viewpoint") < prompt.indexOf("image 2 is a style reference only"));
    assert.ok(prompt.indexOf("image 2 as the primary style authority") < prompt.indexOf('Apply the selected "Modern"'));
  }
});

test("generator uploads one optional reference and sends only its signed URL", () => {
  const generator = source("components/generator/room-generator.tsx");
  assert.match(generator, /Copy a style/);
  assert.match(generator, /referenceFile \? await uploadInputImage\(referenceFile, "reference"/);
  assert.match(generator, /referenceImageUrl/);
  assert.doesNotMatch(generator, /readAsDataURL|data:image/);
});

test("reference UI stays optional, explains scope, and surfaces friendly validation copy", () => {
  const generator = source("components/generator/room-generator.tsx");
  assert.match(generator, /Your room/);
  assert.match(generator, /Upload the room you want to redesign\./);
  assert.match(generator, /Copy a style/);
  assert.match(generator, />Optional<\/span>/);
  assert.match(generator, /colors, materials, furniture style, and mood while keeping your room as the base/);
  assert.match(generator, /Upload an inspiration photo/);
  assert.match(generator, /Upload reference image/);
  assert.match(generator, /Pinterest, Instagram, hotel rooms, interiors you love/);
  assert.match(generator, /Your reference image takes priority when its visual style differs from the selected preset\./);
  assert.match(generator, /Keep your room structure and viewpoint while applying the reference style\./);
  assert.match(generator, /Allow more creative layout changes while keeping the same room and camera viewpoint\./);
  assert.match(generator, /Unsupported image format\. Use JPG or PNG\./);
  assert.match(generator, /Reference image must be 10MB or smaller\./);
  assert.match(generator, /We couldn't upload the reference image\. Please try again\./);
});

test("generate API validates and snapshots an optional private reference path", () => {
  const route = source("app/api/generate/route.ts");
  const uploadRoute = source("app/api/uploads/room-image/route.ts");
  const assets = source("lib/assets/frame-assets.ts");
  assert.match(route, /referenceImageUrl\?: unknown/);
  assert.match(route, /resolveSubmittedReferenceFrame/);
  assert.match(route, /reference_frame_path: referenceFrame\?\.path \?\? null/);
  assert.match(route, /Please upload a valid PNG or JPG reference image/);
  assert.match(assets, /reference-pending/);
  assert.match(assets, /assertStoredInput\(input\.admin, path\)/);
  assert.match(uploadRoute, /signUploadedInput\(\{ admin, path: body\.path, ownerId: owner\.ownerId!, kind \}\)/);
  assert.match(assets, /export async function signUploadedInput[\s\S]*finalizeSanitizedRoomImage\(\{/);
});

test("production After Image receives both signed images while video still receives before and after only", () => {
  const pipeline = source("app/api/generations/[id]/route.ts");
  const fal = source("lib/image/providers/fal-kontext.ts");
  assert.match(pipeline, /referenceImage = job\.reference_frame_path \? await resolveInputFrame/);
  assert.match(pipeline, /\.\.\.\(referenceImage \? \{ referenceImage \} : \{\}\)/);
  assert.match(fal, /image_urls: \[input\.firstFrame, input\.referenceImage\]/);
  assert.match(fal, /input\.referenceImage \? this\.multiModel : this\.model/);
  assert.match(pipeline, /const input = \{ firstFrame, lastFrame, prompt: buildRoomTransitionPrompt/);
  assert.doesNotMatch(pipeline, /const input = \{ firstFrame, lastFrame, referenceImage/);
});

test("reference snapshot survives job reload/recovery without leaking through history or result views", () => {
  const pipeline = source("app/api/generations/[id]/route.ts");
  const history = source("lib/generation/history.ts");
  const result = source("app/result/[id]/page.tsx");
  const migration = source("supabase/migrations/008_generation_reference_image.sql");
  assert.match(pipeline, /let job = await getJob\(id\)/);
  assert.match(pipeline, /job\.reference_frame_path/);
  assert.match(migration, /add column if not exists reference_frame_path text/i);
  assert.doesNotMatch(history, /reference_frame_url/);
  assert.doesNotMatch(result, /reference_frame_url/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
