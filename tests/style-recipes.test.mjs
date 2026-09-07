import assert from "node:assert/strict";
import test from "node:test";
import { buildRoomRedesignPrompt, STYLE_RULES } from "../lib/prompts/room-redesign.ts";

const EXPECTED_STYLES = [
  "Modern",
  "Scandinavian",
  "Japandi",
  "Mid-century Modern",
  "Industrial",
  "Bohemian",
  "Luxury",
  "French Country",
  "Minimalist",
  "Art Deco",
  "Coastal",
  "Farmhouse",
  "Mediterranean",
  "Contemporary",
  "Traditional",
];

const promptFor = (style, scope = "keep-layout") =>
  buildRoomRedesignPrompt("Living Room", style, scope);

const has = (prompt, text) => assert.ok(prompt.includes(text), `prompt should include: ${text}`);

test("all 15 styles have a recipe", () => {
  assert.equal(Object.keys(STYLE_RULES).length, 15);
  assert.deepEqual(Object.keys(STYLE_RULES).sort(), [...EXPECTED_STYLES].sort());
});

test("every recipe has a positive identity across all dimensions", () => {
  for (const name of EXPECTED_STYLES) {
    const recipe = STYLE_RULES[name];
    assert.ok(recipe, `missing recipe for ${name}`);
    for (const field of ["palette", "materials", "furniture", "lighting", "decor"]) {
      assert.ok(recipe[field] && recipe[field].trim().length > 0, `${name}.${field} is empty`);
    }
    assert.ok(recipe.avoid && recipe.avoid.trim().length > 0, `${name}.avoid is empty`);
  }
});

test("every recipe renders an anti-style / avoid instruction", () => {
  for (const name of EXPECTED_STYLES) {
    const prompt = promptFor(name);
    assert.match(prompt, /AVOID/i, `${name} should render an AVOID instruction`);
  }
});

test("Scandinavian and Japandi guidance differ", () => {
  assert.notEqual(
    JSON.stringify(STYLE_RULES["Scandinavian"]),
    JSON.stringify(STYLE_RULES["Japandi"]),
  );
});

test("Modern and Contemporary guidance differ", () => {
  assert.notEqual(
    JSON.stringify(STYLE_RULES["Modern"]),
    JSON.stringify(STYLE_RULES["Contemporary"]),
  );
});

test("Mediterranean forbids structural arches and structural architecture", () => {
  const med = promptFor("Mediterranean");
  has(med, "do NOT create arched windows, arched doors");
  has(med, "structural Mediterranean architecture");
});

test("Industrial does not require changing architecture to brick", () => {
  const industrial = promptFor("Industrial");
  has(industrial, "do NOT change architecture to exposed brick");
  has(industrial, "Industrial identity must come from finishes, furniture, materials, lighting, and decor");
});

test("Farmhouse does not require inventing new beams", () => {
  has(promptFor("Farmhouse"), "do not invent structural beams or change architecture");
});

test("Art Deco carries glamour / brass / geometric identity", () => {
  const deco = promptFor("Art Deco");
  has(deco, "brass");
  has(deco, "geometric");
  has(deco, "glamorous");
});

test("Bohemian carries layered / rattan / pattern identity", () => {
  const boho = promptFor("Bohemian");
  has(boho, "layered rugs");
  has(boho, "rattan");
  has(boho, "patterned cushions");
});

test("Scandinavian carries pale wood / Nordic identity", () => {
  const scandi = promptFor("Scandinavian");
  has(scandi, "pale oak");
  has(scandi, "Nordic");
});

test("Mediterranean carries terracotta / stone / warm wood identity", () => {
  const med = promptFor("Mediterranean");
  has(med, "terracotta");
  has(med, "stone");
  has(med, "warm wood");
});

test("Contemporary carries sculptural / polished identity", () => {
  const contemporary = promptFor("Contemporary");
  has(contemporary, "sculptural");
  has(contemporary, "polished");
});

test("keep layout forbids falling back to generic warm-neutral contemporary", () => {
  const keep = promptFor("Scandinavian");
  has(keep, "generic warm-neutral contemporary");
  has(keep, "visually unmistakable");
});

test("keep layout requires style change across multiple major dimensions", () => {
  has(promptFor("Scandinavian"), "multiple major design dimensions");
});

test("camera and window/door architecture rules remain locked", () => {
  const keep = promptFor("Mediterranean");
  has(keep, "Keep the same camera viewpoint");
  has(keep, "Keep every door, window, and opening");
});

test("reimagine-space remains permissive and skips the keep-layout strength block", () => {
  const reimagine = promptFor("Contemporary", "reimagine-space");
  has(reimagine, "reimagine the space");
  assert.doesNotMatch(reimagine, /generic warm-neutral contemporary/);
});