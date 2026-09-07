import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_DESIGN_SCOPE,
  normalizeStoredDesignScope,
  parseRequestedDesignScope,
} from "../lib/generation/design-scope.ts";
import { buildRoomRedesignPrompt } from "../lib/prompts/room-redesign.ts";

test("generation API design scope validation accepts both production values", () => {
  assert.equal(parseRequestedDesignScope("keep-layout"), "keep-layout");
  assert.equal(parseRequestedDesignScope("reimagine-space"), "reimagine-space");
});

test("missing design scope is backwards compatible and invalid values are rejected", () => {
  assert.equal(parseRequestedDesignScope(null), DEFAULT_DESIGN_SCOPE);
  assert.equal(parseRequestedDesignScope(""), DEFAULT_DESIGN_SCOPE);
  assert.equal(parseRequestedDesignScope("remove-everything"), null);
  assert.equal(normalizeStoredDesignScope(null), "keep-layout");
  assert.equal(normalizeStoredDesignScope(undefined), "keep-layout");
  assert.equal(normalizeStoredDesignScope("legacy-value"), "keep-layout");
});

test("After Image prompt receives the persisted job design scope", () => {
  const keep = buildRoomRedesignPrompt("Living Room", "Japandi", normalizeStoredDesignScope("keep-layout"));
  const reimagine = buildRoomRedesignPrompt("Living Room", "Japandi", normalizeStoredDesignScope("reimagine-space"));
  assert.match(keep, /Design scope: keep the existing layout/i);
  assert.match(reimagine, /Design scope: reimagine the space/i);

  const pipeline = source("app/api/generations/[id]/route.ts");
  assert.match(pipeline, /buildRoomRedesignPrompt\(job\.room_type, job\.style, normalizeStoredDesignScope\(job\.design_scope\)\)/);
  assert.doesNotMatch(pipeline, /designScope.*searchParams|designScope.*formData/);
});

test("production After Image wiring preserves the complete viewpoint prompt for both scopes", () => {
  const pipeline = source("app/api/generations/[id]/route.ts");
  const gateway = source("lib/image/gateway.ts");
  const remote = source("lib/image/providers/remote.ts");

  assert.match(pipeline, /generateAfterFrame\(\{ firstFrame, roomType: job\.room_type, style: job\.style, prompt: buildRoomRedesignPrompt/);
  assert.match(gateway, /return factory\(\)\.generate\(input\)/);
  assert.match(remote, /body: JSON\.stringify\(input\)/);
  assert.doesNotMatch(remote, /prompt\.(?:slice|substring)|prompt\s*=\s*input\.style/);

  for (const scope of ["keep-layout", "reimagine-space"]) {
    const prompt = buildRoomRedesignPrompt("Living Room", "Art Deco", scope);
    assert.match(prompt, /keep the same camera viewpoint/i);
    assert.match(prompt, /preserve the framing exactly/i);
    assert.match(prompt, /preserve the crop and field of view exactly/i);
    assert.match(prompt, /do not zoom in, zoom out, pan, tilt, rotate, or reframe/i);
    assert.ok(prompt.indexOf("Keep the same camera viewpoint") < prompt.indexOf('Apply the selected "Art Deco"'), "viewpoint rules must precede and constrain the selected style");
    const providerBody = JSON.stringify({ firstFrame: "https://example.test/before.jpg", roomType: "Living Room", style: "Art Deco", prompt });
    assert.equal(JSON.parse(providerBody).prompt, prompt);
  }
});

test("polling and recovery reload the job and keep using its design scope snapshot", () => {
  const pipeline = source("app/api/generations/[id]/route.ts");
  assert.match(pipeline, /let job = await getJob\(id\)/);
  assert.match(pipeline, /await advanceJob\(job\)/);
  assert.match(pipeline, /job = \(await getJob\(id\)\) \?\? job/);
  assert.match(pipeline, /normalizeStoredDesignScope\(job\.design_scope\)/);
  assert.doesNotMatch(pipeline, /request\.(?:formData|json)\(\)/);
});

test("mock and remote After Image providers remain compatible without replacing the prompt", () => {
  const mock = source("lib/image/providers/mock.ts");
  const remote = source("lib/image/providers/remote.ts");
  assert.match(mock, /generate\(input: GenerateAfterFrameInput\)/);
  assert.match(remote, /generate\(input: GenerateAfterFrameInput\)/);
  assert.match(remote, /JSON\.stringify\(input\)/);
  assert.doesNotMatch(remote, /buildRoomRedesignPrompt|input\.prompt\s*=/);
});

test("new jobs persist design_scope and stateless jobs snapshot it", () => {
  const create = source("app/api/generate/route.ts");
  assert.match(create, /parseRequestedDesignScope\(form\.get\("designScope"\)\)/);
  assert.match(create, /design_scope: designScope/);
  assert.match(create, /designScope: input\.designScope/);
  assert.match(create, /Choose a valid design scope\./);
});

test("migration adds a constrained non-null field with a legacy default", () => {
  const migration = source("supabase/migrations/005_generation_design_scope.sql");
  assert.match(migration, /add column if not exists design_scope text/i);
  assert.match(migration, /set design_scope = 'keep-layout'/i);
  assert.match(migration, /alter column design_scope set default 'keep-layout'/i);
  assert.match(migration, /alter column design_scope set not null/i);
  assert.match(migration, /check \(design_scope in \('keep-layout', 'reimagine-space'\)\)/i);
});

test("owned history reuse returns and restores design scope without generation or credit use", () => {
  const reuse = source("app/api/generations/[id]/reuse/route.ts");
  const generator = source("components/generator/room-generator.tsx");
  assert.match(reuse, /\.eq\("user_id", user\.id\)/);
  assert.match(reuse, /designScope: normalizeStoredDesignScope\(job\.design_scope\)/);
  assert.doesNotMatch(reuse, /reserveGenerationCredit|generateAfterFrame|getVideoGateway/);
  assert.match(generator, /setDesignScope\(data\.designScope\)/);
  assert.match(generator, /body\.append\("designScope", designScope\)/);
  assert.match(generator, /onClick=\{handlePrimaryAction\}/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
