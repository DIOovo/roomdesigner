import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FalH3MaxVideoProvider, isRetryableFalError, mapResolution } from "../lib/video/providers/fal-h3-max.ts";

function withFalKey(run) {
  const previousKey = process.env.FAL_KEY;
  process.env.FAL_KEY = "test-only-key";
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previousKey === undefined) delete process.env.FAL_KEY;
      else process.env.FAL_KEY = previousKey;
    });
}

function fakeFal(overrides = {}) {
  const calls = { submitted: [], statuses: [], results: [] };
  const client = {
    config() {},
    async subscribe() { throw new Error("not used"); },
    queue: {
      async submit(model, options) {
        calls.submitted.push({ model, options });
        return { request_id: "request-same-123" };
      },
      async status(model, options) {
        calls.statuses.push({ model, options });
        return { status: "IN_PROGRESS" };
      },
      async result(model, options) {
        calls.results.push({ model, options });
        return { requestId: options.requestId, data: { video: { url: "https://assets.example.test/result.mp4" } } };
      },
      ...overrides,
    },
  };
  return { client, calls };
}

test("fal H3 Max maps the RoomFacelift first and last frame contract", () => {
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

test("fal H3 Max submits once and returns the provider request ID", async () => withFalKey(async () => {
  const { client, calls } = fakeFal();
  const provider = new FalH3MaxVideoProvider(client);
  const result = await provider.submitVideo({ firstFrame: "before", lastFrame: "after", prompt: "test", seconds: 5, resolution: "480p" });
  assert.deepEqual(result, { providerTaskId: "request-same-123" });
  assert.equal(calls.submitted.length, 1);
}));

test("fal H3 Max keeps queued and processing jobs pending without fetching a result", async () => withFalKey(async () => {
  for (const [remoteStatus, localStatus] of [["IN_QUEUE", "queued"], ["IN_PROGRESS", "processing"]]) {
    const { client, calls } = fakeFal({
      async status(model, options) {
        calls.statuses.push({ model, options });
        return { status: remoteStatus };
      },
    });
    const provider = new FalH3MaxVideoProvider(client);
    assert.deepEqual(await provider.getVideoStatus("existing-request-id"), { status: localStatus });
    assert.equal(calls.results.length, 0);
  }
}));

test("fal H3 Max retrieves a completed result with the exact existing request ID", async () => withFalKey(async () => {
  const { client, calls } = fakeFal({
    async status(model, options) {
      calls.statuses.push({ model, options });
      return { status: "COMPLETED" };
    },
  });
  const provider = new FalH3MaxVideoProvider(client);
  const state = await provider.getVideoStatus("existing-request-id");
  assert.equal(state.status, "completed");
  assert.equal(state.result.providerTaskId, "existing-request-id");
  assert.equal(state.result.videoUrl, "https://assets.example.test/result.mp4");
  assert.equal(calls.statuses[0].options.requestId, "existing-request-id");
  assert.equal(calls.results[0].options.requestId, "existing-request-id");
  assert.equal(calls.submitted.length, 0);
}));

test("fal H3 Max treats temporary status and result failures as retryable", async () => withFalKey(async () => {
  const temporary = Object.assign(new Error("upstream unavailable"), { status: 503 });
  const statusFailure = fakeFal({ async status() { throw temporary; } });
  const statusProvider = new FalH3MaxVideoProvider(statusFailure.client);
  assert.equal((await statusProvider.getVideoStatus("existing-request-id")).status, "retryable");

  const resultFailure = fakeFal({
    async status() { return { status: "COMPLETED" }; },
    async result() { throw Object.assign(new Error("rate limited"), { status: 429 }); },
  });
  const resultProvider = new FalH3MaxVideoProvider(resultFailure.client);
  assert.equal((await resultProvider.getVideoStatus("existing-request-id")).status, "retryable");
  assert.equal(isRetryableFalError(temporary), true);
}));

test("fal H3 Max reports a completed response without video.url as a permanent failure", async () => withFalKey(async () => {
  const { client } = fakeFal({
    async status() { return { status: "COMPLETED" }; },
    async result(_model, options) { return { requestId: options.requestId, data: { video: {} } }; },
  });
  const provider = new FalH3MaxVideoProvider(client);
  assert.deepEqual(await provider.getVideoStatus("existing-request-id"), {
    status: "failed",
    error: "The video provider response was invalid.",
  });
}));

test("generation polling claims completed results once and recovers persistence with the same task", async () => {
  const routeSource = await readFile(new URL("../app/api/generations/[id]/route.ts", import.meta.url), "utf8");
  const pollingBranch = routeSource.slice(routeSource.indexOf('if (job.stage === "generating_video")'), routeSource.indexOf('if (job.stage === "applying_watermark")'));
  assert.match(pollingBranch, /getVideoStatus\(job\.provider_task_id\)/);
  assert.match(pollingBranch, /claimStage\(job\.id, "generating_video", "persisting_video"\)/);
  assert.match(pollingBranch, /provider_task_id: state\.result\.providerTaskId/);
  assert.match(pollingBranch, /persistGeneratedAsset\(\{ admin, sourceUrl: state\.result\.videoUrl/);
  assert.match(pollingBranch, /stage: "applying_watermark"/);
  assert.match(pollingBranch, /isPermanentVideoPersistenceError\(error\)/);
  assert.doesNotMatch(pollingBranch, /submitVideo\(/);
  assert.match(routeSource, /claimStage\(job\.id, "persisting_video", "generating_video"\)/);
  assert.doesNotMatch(routeSource, /job\.stage === "generating_video"\) return elapsed/);
  assert.match(routeSource, /if \(state\.status === "failed"\) throw/);
  assert.match(routeSource, /await failJob\(id, job\.stage\)/);
  assert.match(routeSource, /await releaseGenerationCredit\(id\)/);
});

test("generation credit commit remains idempotent for duplicate completed polls", async () => {
  const migrationSource = await readFile(new URL("../supabase/migrations/003_auth_credits.sql", import.meta.url), "utf8");
  const commitFunction = migrationSource.slice(migrationSource.indexOf("create or replace function public.commit_generation_credit"), migrationSource.indexOf("create or replace function public.release_generation_credit"));
  assert.match(commitFunction, /if v_usage\.status = 'committed' then return true; end if;/);
  assert.match(commitFunction, /if v_usage\.status <> 'reserved' then return false; end if;/);
});

test("free real exports use the authenticated RoomFacelift watermark service contract", async () => {
  const [watermarkSource, configSource] = await Promise.all([
    readFile(new URL("../lib/video/watermark.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/config/generation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(watermarkSource, /Authorization: `Bearer \$\{token\}`/);
  assert.match(watermarkSource, /Made with RoomFacelift/);
  assert.match(watermarkSource, /position: "bottom-right"/);
  assert.match(configSource, /free real generation/);
  assert.match(configSource, /WATERMARK_SERVICE_URL/);
  assert.match(configSource, /WATERMARK_SERVICE_TOKEN/);
});
