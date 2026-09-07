import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRoomTransitionPrompt } from "../lib/prompts/room-transition.ts";
import { FalH3MaxVideoProvider, mapResolution } from "../lib/video/providers/fal-h3-max.ts";

const prompt = buildRoomTransitionPrompt("Living Room", "Japandi");

function contains(text) {
  assert.ok(prompt.includes(text), `expected prompt to include: ${text}`);
}

test("transition prompt is a direct first-frame to final-frame transformation", () => {
  contains("direct transformation from the exact provided first frame to the exact provided final frame");
  contains("STATIC LOCKED CAMERA");
});

test("transition prompt treats the final image as the only target design", () => {
  contains("only allowed target design");
  contains("third interior design");
  contains("converge toward the supplied end image");
});

test("transition prompt requires intermediate frames to approach the final image", () => {
  contains("progressively closer to the final image");
  contains("must not move away from the target design");
});

test("transition prompt forbids temporary objects that exist in neither endpoint", () => {
  contains("temporary furniture");
  contains("cabinetry");
  contains("rugs");
  contains("wall art");
  contains("lighting fixtures");
  contains("exist in neither endpoint");
});

test("transition prompt does not instruct the model to independently redesign", () => {
  contains("do not independently redesign the room");
  assert.doesNotMatch(prompt, /into a refined .* interior/i);
  assert.doesNotMatch(prompt, /redesign the room in .* style/i);
});

test("transition prompt locks the camera and forbids zoom, pan, tilt, and reframing", () => {
  contains("No camera movement, zoom, pan, tilt, rotation, reframing, or dolly movement");
});

test("transition prompt preserves geometry, windows, doors, and room type", () => {
  contains("camera position, perspective, field of view, crop, room geometry, walls, windows, doors");
  contains("Keep it the same living room throughout");
  contains("do not change the room type");
});

test("fal H3 Max keeps image_url=Before and end_image_url=After", () => {
  const previousKey = process.env.FAL_KEY;
  process.env.FAL_KEY = "test-only-key";
  try {
    const provider = new FalH3MaxVideoProvider();
    const input = provider.mapInput({
      firstFrame: "https://assets.example.test/before.jpg",
      lastFrame: "https://assets.example.test/after.jpg",
      prompt: buildRoomTransitionPrompt("Bedroom", "Scandinavian"),
      seconds: 5,
      resolution: "768p",
    });
    assert.equal(input.image_url, "https://assets.example.test/before.jpg");
    assert.equal(input.end_image_url, "https://assets.example.test/after.jpg");
    assert.equal(input.duration, 5);
    assert.equal(input.resolution, "768P");
    assert.equal(input.prompt_expansion_mode, "balanced");
    assert.equal(input.enable_safety_checker, true);
    assert.equal(mapResolution("480p"), "480P");
  } finally {
    if (previousKey === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = previousKey;
  }
});

test("fal H3 Max model, provider_task_id recovery, and prompt expansion remain unchanged", () => {
  const providerSource = source("lib/video/providers/fal-h3-max.ts");
  assert.match(providerSource, /minimax\/h3-max\/image-to-video/);
  assert.match(providerSource, /FAL_H3_MODEL/);
  assert.match(providerSource, /FAL_H3_PROMPT_EXPANSION \?\? "balanced"/);
  assert.match(providerSource, /prompt_expansion_mode: this\.promptExpansion/);

  const routeSource = source("app/api/generations/[id]/route.ts");
  assert.match(routeSource, /getVideoStatus\(job\.provider_task_id\)/);
  assert.match(routeSource, /provider_task_id: state\.result\.providerTaskId/);
  assert.match(routeSource, /claimStage\(job\.id, "persisting_video", "generating_video"\)/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}