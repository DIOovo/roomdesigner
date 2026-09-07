import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FalKontextAfterFrameProvider, falKontextModel } from "../lib/image/providers/fal-kontext.ts";
import { MockAfterFrameProvider } from "../lib/image/providers/mock.ts";

const testInput = {
  firstFrame: "https://assets.example.test/before.jpg",
  roomType: "Living Room",
  style: "Japandi",
  prompt: "Preserve the exact camera viewpoint and redesign the same room.",
};

function withEnv(patch, fn) {
  const saved = {};
  for (const key of Object.keys(patch)) {
    saved[key] = process.env[key];
    if (patch[key] === undefined) delete process.env[key];
    else process.env[key] = patch[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function provider() {
  return new FalKontextAfterFrameProvider();
}

test("gateway selects fal-kontext when AFTER_IMAGE_PROVIDER=fal-kontext", () => {
  const gateway = source("lib/image/gateway.ts");
  assert.match(gateway, /"fal-kontext": \(\) => new FalKontextAfterFrameProvider\(\)/);
  assert.match(gateway, /process\.env\.AFTER_IMAGE_PROVIDER \?\? "mock"/);
});

test("fal-kontext uses AFTER_IMAGE_MODEL when set", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: "fal-ai/custom/kontext" }, () => {
    assert.equal(provider().model, "fal-ai/custom/kontext");
  });
});

test("fal-kontext defaults to fal-ai/flux-pro/kontext/max", () => {
  withEnv({ AFTER_IMAGE_MODEL: undefined }, () => {
    assert.equal(falKontextModel(), "fal-ai/flux-pro/kontext/max");
  });
});

test("fal-kontext maps the before image and the complete existing prompt", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: undefined }, () => {
    const input = provider().mapInput(testInput);
    assert.equal(input.image_url, "https://assets.example.test/before.jpg");
    assert.equal(input.prompt, "Preserve the exact camera viewpoint and redesign the same room.");
  });
});

test("fal-kontext requests a single jpeg with disabled prompt enhancement", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: undefined }, () => {
    const input = provider().mapInput(testInput);
    assert.equal(input.num_images, 1);
    assert.equal(input.output_format, "jpeg");
    assert.equal(input.enhance_prompt, false);
  });
});

test("fal-kontext maps source composition without a fixed aspect ratio", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: undefined }, () => {
    const input = provider().mapInput(testInput);
    assert.equal("aspect_ratio" in input, false, "aspect_ratio must not be hardcoded");
  });
});

test("fal-kontext parses images[0].url into the unified result", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: undefined }, () => {
    const result = provider().mapResult({ images: [{ url: "https://fal.media/after.jpg" }] });
    assert.deepEqual(result, { imageUrl: "https://fal.media/after.jpg", provider: "fal-kontext" });
  });
});

test("fal-kontext fails safely on empty or non-http output", () => {
  withEnv({ FAL_KEY: "test-only-key", AFTER_IMAGE_MODEL: undefined }, () => {
    assert.throws(() => provider().mapResult({}), /could not create the redesigned room/);
    assert.throws(() => provider().mapResult({ images: [] }), /could not create the redesigned room/);
    assert.throws(() => provider().mapResult({ images: [{ url: "file:///etc/passwd" }] }), /could not create the redesigned room/);
  });
});

test("mock and remote providers remain intact", () => {
  assert.equal(new MockAfterFrameProvider().name, "mock");
  const gateway = source("lib/image/gateway.ts");
  assert.match(gateway, /mock: \(\) => new MockAfterFrameProvider\(\)/);
  assert.match(gateway, /remote: \(\) => new RemoteAfterFrameProvider\(\)/);
  const remote = source("lib/image/providers/remote.ts");
  assert.match(remote, /JSON\.stringify\(input\)/);
});

test("fal-kontext requires FAL_KEY and config validation requires FAL_KEY for fal-kontext", () => {
  withEnv({ FAL_KEY: undefined }, () => {
    assert.throws(() => new FalKontextAfterFrameProvider(), /FAL_KEY is required when AFTER_IMAGE_PROVIDER=fal-kontext/);
  });
  assert.match(source("lib/config/generation.ts"), /fal-kontext[^;]*FAL_KEY/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}