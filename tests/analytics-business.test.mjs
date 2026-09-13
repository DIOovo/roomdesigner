import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { sanitizeAnalyticsProperties, toAnalyticsValue, trackEvent } from "../lib/analytics/events.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("business analytics wrapper is SSR-safe and accepts only anonymous allowlisted parameters", () => {
  assert.doesNotThrow(() => trackEvent("generate_click", { room_type: "living_room" }));
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      room_type: "living_room",
      roomType: "living_room",
      style: "modern",
      scope: "keep_layout",
      mode: "keep_layout",
      plan: "pro",
      surface: "bathroom_design",
      failure_stage: "generation",
      reason: "timeout",
      duration: 5,
      generationResult: "failed",
      price: 24.99,
      file_type: "image/png",
      file_size: 1024,
      provider: "google",
      email: "private@example.com",
      user_id: "private-user",
      image_url: "https://private.example/image.png",
      payment_id: "private-payment",
      error: "private error",
    }),
    {
      room_type: "living_room",
      style: "modern",
      scope: "keep_layout",
      plan: "pro",
      surface: "bathroom_design",
      failure_stage: "generation",
      reason: "timeout",
      price: 24.99,
      file_type: "image/png",
      file_size: 1024,
      provider: "google",
    },
  );
  assert.equal(toAnalyticsValue("Mid-century Modern"), "mid_century_modern");
  assert.equal(toAnalyticsValue("keep-layout"), "keep_layout");
});

test("generator-events module emits the existing event names with normalized snake_case parameters", async () => {
  const events = await read("lib/analytics/generator-events.ts");
  for (const name of ["generate_click", "generation_started", "generation_completed", "generation_failed", "room_type_selected", "style_selected"]) {
    assert.match(events, new RegExp(name));
  }
  assert.match(events, /room_type: toAnalyticsValue\(roomType\)/);
  assert.match(events, /style: toAnalyticsValue\(style\)/);
  assert.match(events, /scope: toAnalyticsValue\(scope\)/);
  assert.match(events, /surface/);
  assert.match(events, /failure_stage: failureStage/);
  assert.match(events, /reason: normalizeErrorReason\(error\)/);
  assert.doesNotMatch(events, /reason:\s*error\.message|error\.stack/);
  for (const reason of ["invalid_image", "network_error", "provider_failed", "timeout", "other"]) assert.match(events, new RegExp(`"${reason}"`));
});

test("generation_completed keeps the minimal schema and still has no duration", async () => {
  const events = await read("lib/analytics/generator-events.ts");
  const completed = events.match(/export function trackGenerationCompleted[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(completed, /plan,/);
  assert.match(completed, /surface/);
  assert.doesNotMatch(events, /duration/);
  assert.doesNotMatch(events, /GENERATION_DURATION_SECONDS/);
});

test("room-generator delegates to semantic helpers and preserves the upload event and roomType business field", async () => {
  const generator = await read("components/generator/room-generator.tsx");
  assert.match(generator, /trackGenerateClick\(\{ roomType: room/);
  assert.match(generator, /trackGenerationStarted\(\{/);
  assert.match(generator, /trackGenerationCompleted\(\{/);
  assert.match(generator, /trackGenerationFailed\(\{/);
  assert.match(generator, /trackRoomTypeSelected\(roomType\)/);
  assert.match(generator, /trackStyleSelected\(item\.name\)/);
  assert.doesNotMatch(generator, /toAnalyticsValue/);
  assert.match(generator, /failureStage\.current/);
  assert.match(generator, /surface = "home"/);
  assert.match(generator, /body: JSON\.stringify\(\{ imageUrl, roomType: room, style, scope: designScope \}\)/);
  const uploadEvent = generator.match(/trackEvent\("image_upload_success", \{[\s\S]*?\}\);/)?.[0] ?? "";
  assert.doesNotMatch(uploadEvent, /imageUrl|signedUrl|userId|email/);
});

test("pricing and checkout events stay in the client button without changing the checkout API", async () => {
  const button = await read("components/pricing/checkout-button.tsx");
  assert.match(button, /trackEvent\("pricing_click", \{ plan: analyticsPlan \}\)/);
  assert.match(button, /trackEvent\("checkout_started", \{ plan: analyticsPlan, price \}\)[\s\S]*fetch\("\/api\/waffo\/checkout"/);
  assert.match(button, /starter" \? 9\.99[\s\S]*pro" \? 24\.99[\s\S]*19\.99/);
});

test("email and Google completions emit provider-only login analytics", async () => {
  const [form, callback, analytics] = await Promise.all([
    read("components/auth/auth-form.tsx"),
    read("app/auth/callback/route.ts"),
    read("components/analytics.tsx"),
  ]);
  assert.match(form, /trackEvent\("login_completed", \{ provider: "email" \}\)/);
  assert.match(callback, /app_metadata\.provider === "google"/);
  assert.match(analytics, /trackEvent\("login_completed", \{ provider \}\)/);
});

test("purchase remains absent from client analytics and Waffo webhook remains untouched by tracking", async () => {
  const [components, webhook] = await Promise.all([
    Promise.all([
      "components/analytics.tsx",
      "components/generator/room-generator.tsx",
      "components/pricing/checkout-button.tsx",
      "components/account/payment-status.tsx",
    ].map(read)).then((files) => files.join("\n")),
    read("app/api/waffo/webhook/route.ts"),
  ]);
  assert.doesNotMatch(components, /track(?:Event)?\("purchase"/);
  assert.doesNotMatch(webhook, /gtag|Google Analytics|trackEvent|analytics\/events/);
});
