import assert from "node:assert/strict";
import test from "node:test";
import { buildRoomRedesignPrompt } from "../lib/prompts/room-redesign.ts";

const keep = buildRoomRedesignPrompt("Living Room", "Contemporary", "keep-layout");

function has(text) {
  assert.ok(keep.includes(text), `keep-layout prompt should include: ${text}`);
}

test("keep layout still locks the camera and room geometry", () => {
  assert.match(keep, /keep the same camera viewpoint/i);
  assert.match(keep, /same room geometry, dimensions, and apparent floor area/i);
});

test("keep layout still preserves windows and doors", () => {
  assert.match(keep, /keep every door, window, and opening/i);
  assert.match(keep, /do not add, remove, or move any door, window, or opening/i);
});

test("keep layout explicitly requires a substantial redesign", () => {
  has("redesign the interior boldly");
  has("substantially transformed");
  has("not a minimal edit of the original room");
});

test("keep layout forbids minimal cosmetic-only edits", () => {
  has("minimally edited version of the original room");
  has("one or two small decorative items");
});

test("keep layout encourages coordinated changes across multiple interior dimensions", () => {
  has("furniture, materials, lighting, textiles, decor, and the color palette");
  has("coordinated changes across several major dimensions");
});

test("keep layout encourages furniture, material, lighting, textile, and decor redesign", () => {
  has("replacement furniture");
  has("stone / plaster / metal finishes");
  has("lighting fixtures and lamps");
  has("textiles, cushions");
  has("wall art");
});

test("keep layout requires the target style to be immediately recognizable", () => {
  has("immediately recognize the requested interior style");
  has("without reading a style label");
});

test("keep layout lets furniture around major anchors change but keeps anchors in place", () => {
  has("wall-mounted TV");
  has("replace the console below the TV with a new one");
  has("do not move the sofa to another wall");
});

test("Mediterranean guidance is expressed through finishes, not structural changes", () => {
  const med = buildRoomRedesignPrompt("Living Room", "Mediterranean", "keep-layout");
  assert.match(med, /warm ivory/i);
  assert.match(med, /textured plaster/i);
  assert.match(med, /do NOT create arched windows, arched doors/i);
  assert.match(med, /or structural Mediterranean architecture/i);
});

test("Contemporary guidance is explicitly recognizable", () => {
  const contemporary = buildRoomRedesignPrompt("Living Room", "Contemporary", "keep-layout");
  assert.match(contemporary, /Contemporary identity/i);
  assert.match(contemporary, /sculptural/i);
  assert.match(contemporary, /more polished, architectural, and sculptural/i);
});

test("reimagine-space stays permissive and skips the bold keep-layout redesign block", () => {
  const reimagine = buildRoomRedesignPrompt("Living Room", "Contemporary", "reimagine-space");
  assert.match(reimagine, /reimagine the space/i);
  assert.match(reimagine, /keep the same camera viewpoint/i);
  assert.doesNotMatch(reimagine, /redesign the interior boldly/);
});

test("camera lock and style guidance apply to both design scopes", () => {
  const contemporary = buildRoomRedesignPrompt("Bedroom", "Contemporary", "reimagine-space");
  assert.match(contemporary, /keep the same camera viewpoint/i);
  assert.match(contemporary, /Contemporary identity/i);
});