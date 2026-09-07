import assert from "node:assert/strict";
import test from "node:test";
import { buildRoomRedesignPrompt, ROOM_TYPE_RULES } from "../lib/prompts/room-redesign.ts";

test("after-frame prompt enforces the same physical room", () => {
  const prompt = buildRoomRedesignPrompt("Bedroom", "Japandi");
  assert.match(prompt, /same physical space/i);
  assert.match(prompt, /same room shown/i);
  assert.match(prompt, /not a new room/i);
});

test("after-frame prompt enforces the same room type", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern");
  assert.match(prompt, /must remain the same living room/i);
  assert.match(prompt, /do not change the room type/i);
});

test("default prompt locks the camera viewpoint", () => {
  const prompt = buildRoomRedesignPrompt("Bedroom", "Japandi");
  assert.match(prompt, /keep the same camera viewpoint/i);
  assert.match(prompt, /camera position/i);
  assert.match(prompt, /camera height/i);
  assert.match(prompt, /camera angle/i);
  assert.match(prompt, /perspective/i);
});

test("default prompt preserves framing, crop, and field of view", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern");
  assert.match(prompt, /preserve the framing/i);
  assert.match(prompt, /preserve the crop and field of view/i);
  assert.match(prompt, /visible room boundaries/i);
  assert.match(prompt, /visible scene coverage/i);
});

test("default prompt forbids zoom, pan, tilt, rotate, and reframe", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern");
  assert.match(prompt, /do not zoom in/i);
  assert.match(prompt, /zoom out/i);
  assert.match(prompt, /pan, tilt, rotate, or reframe/i);
});

test("default prompt forbids cropping away visible areas", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern");
  assert.match(prompt, /do not crop away areas visible/i);
  assert.match(prompt, /do not crop out visible walls, windows, doors/i);
});

test("keep-layout uses the viewpoint lock and preserves structural constraints", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern", "keep-layout");
  assert.match(prompt, /keep the same camera viewpoint/i);
  assert.match(prompt, /keep every door, window, and opening/i);
  assert.match(prompt, /same room geometry, dimensions, and apparent floor area/i);
  assert.match(prompt, /do not replace ordinary windows with floor-to-ceiling windows/i);
});

test("reimagine-space also uses the viewpoint lock", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern", "reimagine-space");
  assert.match(prompt, /reimagine the space/i);
  assert.match(prompt, /conceptual inspiration/i);
  assert.match(prompt, /keep the same camera viewpoint/i);
  assert.match(prompt, /do not zoom in/i);
});

test("reimagine-space stays more permissive on structure only", () => {
  const prompt = buildRoomRedesignPrompt("Living Room", "Modern", "reimagine-space");
  assert.match(prompt, /more substantial interior architecture/i);
  assert.doesNotMatch(prompt, /do not replace ordinary windows with floor-to-ceiling windows/i);
});

test("reimagine-space still keeps the room type", () => {
  const prompt = buildRoomRedesignPrompt("Bedroom", "Japandi", "reimagine-space");
  assert.match(prompt, /must remain the same bedroom/i);
  assert.match(prompt, /do not change the room type/i);
});

test("kitchen and bathroom keep their own hard constraints", () => {
  assert.match(buildRoomRedesignPrompt("Kitchen", "Modern"), /keep the kitchen functional/i);
  assert.match(buildRoomRedesignPrompt("Kitchen", "Modern"), /do not remove all cabinetry or counters/i);
  assert.match(buildRoomRedesignPrompt("Bathroom", "Coastal"), /preserve the major wet-area logic/i);
  assert.match(buildRoomRedesignPrompt("Bathroom", "Coastal"), /keep it clearly a bathroom/i);
});

test("bedroom and living room forbid cross room-type drift", () => {
  assert.match(buildRoomRedesignPrompt("Bedroom", "Scandinavian"), /do not replace the bed with a sofa/i);
  assert.match(buildRoomRedesignPrompt("Living Room", "Japandi"), /do not turn this into a bedroom/i);
});

test("style name is injected for both design scopes", () => {
  assert.match(buildRoomRedesignPrompt("Bedroom", "Japandi"), /Japandi/);
  assert.match(buildRoomRedesignPrompt("Bedroom", "Japandi", "reimagine-space"), /Japandi/);
});

test("overlay alignment and photo-realistic composition are expressed", () => {
  const prompt = buildRoomRedesignPrompt("Dining Room", "Luxury");
  assert.match(prompt, /if overlaid/i);
  assert.match(prompt, /before and after images should remain closely aligned/i);
  assert.match(prompt, /photorealistic/i);
});

test("every supported room type has an explicit rule", () => {
  for (const roomType of ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Dining Room", "Office", "Basement", "Attic", "Study"]) {
    assert.ok(ROOM_TYPE_RULES[roomType.toLowerCase()], `missing rule for ${roomType}`);
  }
});