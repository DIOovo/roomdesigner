import assert from "node:assert/strict";
import test from "node:test";
import { FalH3MaxVideoProvider, mapResolution } from "../lib/video/providers/fal-h3-max.ts";

test("fal H3 Max maps the Roomorphic first and last frame contract", () => {
  const previousKey = process.env.FAL_KEY;
  process.env.FAL_KEY = "test-only-key";
  try {
    const provider = new FalH3MaxVideoProvider();
    const input = provider.mapInput({
      firstFrame: "https://assets.example.test/before.jpg",
      lastFrame: "https://assets.example.test/after.jpg",
      prompt: "Preserve the room geometry and transition to Japandi.",
      seconds: 5,
      resolution: "480p",
    });
    assert.deepEqual(input, {
      image_url: "https://assets.example.test/before.jpg",
      end_image_url: "https://assets.example.test/after.jpg",
      prompt: "Preserve the room geometry and transition to Japandi.",
      duration: 5,
      resolution: "480P",
      prompt_expansion_mode: "balanced",
      enable_safety_checker: true,
    });
  } finally {
    if (previousKey === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = previousKey;
  }
});

test("fal H3 Max rejects unsupported duration and resolution", () => {
  const previousKey = process.env.FAL_KEY;
  process.env.FAL_KEY = "test-only-key";
  try {
    const provider = new FalH3MaxVideoProvider();
    assert.throws(() => provider.mapInput({ firstFrame: "before", lastFrame: "after", prompt: "test", seconds: 3, resolution: "480p" }), /5-second duration/);
    assert.equal(mapResolution("768p"), "768P");
    assert.throws(() => mapResolution("1080p"), /does not support 1080p/);
  } finally {
    if (previousKey === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = previousKey;
  }
});
