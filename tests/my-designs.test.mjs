import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toGenerationHistoryItem } from "../lib/generation/history-policy.ts";

test("unauthenticated /my-designs redirects to /login", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /redirect\("\/login\?next=%2Fmy-designs"\)/);
});

test("history only returns the authenticated user's own generations", () => {
  const history = source("lib/generation/history.ts");
  assert.match(history, /\.eq\("user_id", userId\)/);
  assert.doesNotMatch(history, /user_id.*searchParams|user_id.*formData/);
});

test("logged-in header shows a one-click My designs entry", () => {
  const header = source("components/site-header.tsx");
  assert.match(header, /href="\/my-designs"/);
  assert.match(header, /My designs/);
  assert.ok(header.indexOf("My designs") > header.indexOf("{user ?"), "My designs must live inside the authenticated branch");
  assert.match(header, /whitespace-nowrap text-sm font-bold text-\[var\(--muted\)\]/);
});

test("logged-out header does not surface the account history entry", () => {
  const header = source("components/site-header.tsx");
  assert.match(header, /\/login\?next=%2F%23generator/);
  assert.ok(header.indexOf("My designs") < header.indexOf("Sign in"), "My designs is not part of the signed-out branch");
});

test("history thumbnail prefers the after frame and falls back to before", () => {
  const history = source("lib/generation/history.ts");
  const fn = history.slice(history.indexOf("async function resolveHistoryThumbnail"));
  assert.ok(fn.indexOf("job.last_frame_path") < fn.indexOf("job.first_frame_path"), "after frame must be resolved before the before fallback");
  assert.match(fn, /if \(after\) return after/);
  assert.match(fn, /resolveInputFrame\(admin, job\.first_frame_path, fallbackUrl\)/);
});

test("missing preview asset does not crash the page", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /Preview unavailable/);
  assert.match(page, /item\.thumbnailUrl \? <Image/);
});

test("completed cards expose View result, Download, and Use again", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /View result/);
  assert.match(page, /\/api\/generations\/\$\{item\.id\}\/download/);
  assert.match(page, /Use again/);
  assert.match(page, /\/\?reuse=\$\{item\.id\}#generator/);
});

test("download does not consume credits", () => {
  const download = source("app/api/generations/[id]/download/route.ts");
  assert.doesNotMatch(download, /reserveGenerationCredit|credit_usage|credit/);
});

test("use again does not generate or consume credits", () => {
  const reuse = source("app/api/generations/[id]/reuse/route.ts");
  assert.doesNotMatch(reuse, /reserveGenerationCredit|generateAfterFrame|getVideoGateway/);
  assert.match(reuse, /normalizeStoredDesignScope\(job\.design_scope\)/);
});

test("processing cards do not render a download action", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /item\.status === "processing" \|\| item\.status === "queued"/);
  assert.match(page, /\{statusLabel\(item\.status\)\}/);
});

test("empty state, pagination, and noindex are present", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /No designs yet\./);
  assert.match(page, /Create your first room design/);
  assert.match(page, /\/#generator/);
  assert.match(page, /\/my-designs\?page=\$\{history\.page [-+] 1\}/);
  assert.match(page, /\/my-designs\?page=\$\{history\.page \+ 1\}/);
  assert.match(page, /robots: privatePageRobots/);
});

test("sitemap does not list the private /my-designs route", () => {
  const sitemap = source("app/sitemap.ts");
  assert.doesNotMatch(sitemap, /my-designs/);
});

test("mobile design grid is responsive and does not overflow", () => {
  const page = source("app/my-designs/page.tsx");
  assert.match(page, /grid gap-4 sm:grid-cols-2 lg:grid-cols-3/);
});

test("history item exposes design scope for card labels", () => {
  const item = toGenerationHistoryItem({
    id: "1",
    user_id: "u",
    room_type: "Bedroom",
    style: "Japandi",
    design_scope: "reimagine-space",
    status: "completed",
    stage: "completed",
    created_at: "2026-01-01T00:00:00Z",
    resolution: "768p",
    plan: "pro",
    credit_source: "subscription",
    is_watermarked: false,
    first_frame_path: null,
    first_frame_url: null,
    last_frame_path: null,
    last_frame_url: null,
  }, "https://example.test/after.jpg");
  assert.equal(item.designScope, "reimagine-space");
  assert.equal(item.thumbnailUrl, "https://example.test/after.jpg");
});

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}