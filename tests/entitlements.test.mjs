import assert from "node:assert/strict";
import test from "node:test";
import { calculateEntitlements } from "../lib/entitlements/rules.ts";

const now = Date.parse("2026-09-04T00:00:00Z");

test("anonymous users receive exactly one no-login preview", () => {
  const fresh = calculateEntitlements({ authenticated: false, anonymousCreditsRemaining: 1, now });
  const used = calculateEntitlements({ authenticated: false, anonymousCreditsRemaining: 0, now });
  assert.equal(fresh.totalCreditsRemaining, 1);
  assert.equal(fresh.watermarkRequired, true);
  assert.equal(used.totalCreditsRemaining, 0);
});

test("free accounts receive watermarked 480p generations", () => {
  const value = calculateEntitlements({ authenticated: true, grants: [{ source: "free", credits_remaining: 2, expires_at: null }], now });
  assert.deepEqual({ plan: value.plan, total: value.totalCreditsRemaining, watermark: value.watermarkRequired, resolution: value.resolution }, { plan: "free", total: 2, watermark: true, resolution: "480p" });
});

test("Starter and Pro entitlements remain distinct", () => {
  const grants = [{ source: "subscription", credits_remaining: 20, expires_at: "2026-10-01T00:00:00Z" }];
  const starter = calculateEntitlements({ authenticated: true, grants, subscriptions: [{ plan: "starter", status: "active", current_period_end: "2026-10-01T00:00:00Z" }], now });
  const pro = calculateEntitlements({ authenticated: true, grants, subscriptions: [{ plan: "pro", status: "trialing", current_period_end: "2026-10-01T00:00:00Z" }], now });
  assert.deepEqual([starter.resolution, starter.watermarkRequired, starter.commercialLicense, starter.priorityQueue], ["768p", false, false, false]);
  assert.deepEqual([pro.resolution, pro.watermarkRequired, pro.commercialLicense, pro.priorityQueue], ["768p", false, true, true]);
});

test("credit-pack-only access is clean HD without commercial rights", () => {
  const value = calculateEntitlements({ authenticated: true, grants: [{ source: "credit_pack", credits_remaining: 30, expires_at: "2027-09-04T00:00:00Z" }], now });
  assert.deepEqual([value.plan, value.resolution, value.watermarkRequired, value.commercialLicense], ["free", "768p", false, false]);
});

test("expired grants and inactive subscriptions confer no entitlement", () => {
  const value = calculateEntitlements({ authenticated: true, grants: [
    { source: "subscription", credits_remaining: 12, expires_at: "2026-08-01T00:00:00Z" },
    { source: "credit_pack", credits_remaining: 3, expires_at: "2026-09-03T23:59:59Z" },
  ], subscriptions: [{ plan: "pro", status: "canceled", current_period_end: "2026-10-01T00:00:00Z" }], now });
  assert.deepEqual([value.totalCreditsRemaining, value.plan, value.commercialLicense, value.priorityQueue], [0, "free", false, false]);
});
