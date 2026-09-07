import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canReuseGeneration,
  isOwnedByUser,
  playableAssetReference,
  toGenerationHistoryItem,
} from "../lib/generation/history-policy.ts";

const ownerId = "user-a";
const baseJob = {
  id: "job-1",
  user_id: ownerId,
  room_type: "Bedroom",
  style: "Japandi",
  status: "completed",
  stage: "completed",
  created_at: "2026-09-05T09:00:00.000Z",
  resolution: "480p",
  plan: "free",
  credit_source: "free",
  is_watermarked: true,
  first_frame_path: "user-a/job-1/before.jpg",
  first_frame_url: null,
};

test("history ownership is tied to the authenticated user", () => {
  assert.equal(isOwnedByUser(baseJob, ownerId), true);
  assert.equal(isOwnedByUser(baseJob, "user-b"), false);
  assert.equal(canReuseGeneration(baseJob, ownerId), true);
  assert.equal(canReuseGeneration(baseJob, "user-b"), false);
});

test("completed, processing, and failed jobs retain their safe history status", () => {
  for (const status of ["completed", "processing", "failed"]) {
    const item = toGenerationHistoryItem({ ...baseJob, status, stage: status }, "https://signed.example/before");
    assert.equal(item.status, status);
    assert.equal(item.roomType, "Bedroom");
    assert.equal(item.style, "Japandi");
    assert.equal("raw_video_path" in item, false);
    assert.equal("first_frame_path" in item, false);
  }
  assert.equal(canReuseGeneration({ ...baseJob, status: "processing" }, ownerId), false);
});

test("free history can resolve only the watermarked video asset", () => {
  const asset = playableAssetReference({
    is_watermarked: true,
    watermarked_video_path: "job-1/watermarked-video.mp4",
    watermarked_video_url: "https://stale.example/watermarked",
    raw_video_path: "job-1/raw-video.mp4",
    raw_video_url: "https://private.example/raw",
    video_url: "https://stale.example/video",
  });
  assert.deepEqual(asset, { path: "job-1/watermarked-video.mp4", fallbackUrl: null });
  assert.equal(JSON.stringify(asset).includes("raw-video"), false);
});

test("paid history follows the existing clean asset policy", () => {
  const asset = playableAssetReference({
    is_watermarked: false,
    watermarked_video_path: "job-1/watermarked-video.mp4",
    watermarked_video_url: null,
    raw_video_path: "job-1/raw-video.mp4",
    raw_video_url: null,
    video_url: null,
  });
  assert.deepEqual(asset, { path: "job-1/raw-video.mp4", fallbackUrl: null });
});

test("history, download, and reuse server paths enforce ownership without reserving credits", () => {
  const history = source("lib/generation/history.ts");
  const download = source("app/api/generations/[id]/download/route.ts");
  const reuse = source("app/api/generations/[id]/reuse/route.ts");
  const result = source("app/result/[id]/page.tsx");

  assert.match(history, /\.eq\("user_id", userId\)/);
  assert.match(history, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(history, /HISTORY_PAGE_SIZE = 12/);
  assert.match(download, /\.eq\("user_id", user\.id\)/);
  assert.match(reuse, /\.eq\("user_id", user\.id\)/);
  assert.match(result, /canAccessJob\(job, viewer\)/);

  for (const file of [history, download, reuse, result]) {
    assert.doesNotMatch(file, /reserveGenerationCredit|generateAfterFrame|getVideoGateway/);
  }
});

test("reuse returns settings only and persisted storage assets do not save signed URLs", () => {
  const reuse = source("app/api/generations/[id]/reuse/route.ts");
  const create = source("app/api/generate/route.ts");
  const pipeline = source("app/api/generations/[id]/route.ts");

  assert.match(reuse, /roomType: job\.room_type, style: job\.style/);
  assert.doesNotMatch(reuse, /raw_video_path|watermarked_video_path|first_frame_path/);
  assert.match(create, /first_frame_url: firstFrame\.path \? null : firstFrame\.url/);
  assert.match(pipeline, /last_frame_url: persisted\.path \? null : persisted\.url/);
  assert.match(pipeline, /raw_video_url: persisted\.path \? null : persisted\.url/);
  assert.match(pipeline, /watermarked_video_url: storedUrl/);
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
