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
      style: "modern",
      mode: "keep_layout",
      plan: "pro",
      duration: 5,
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
      mode: "keep_layout",
      plan: "pro",
      duration: 5,
      price: 24.99,
      file_type: "image/png",
      file_size: 1024,
      provider: "google",
    },
  );
  assert.equal(toAnalyticsValue("Mid-century Modern"), "mid_century_modern");
  assert.equal(toAnalyticsValue("keep-layout"), "keep_layout");
});

test("generator events use the required names and real upload, job acceptance, and completion boundaries", async () => {
  const generator = await read("components/generator/room-generator.tsx");
  assert.match(generator, /trackEvent\("generate_click"[\s\S]*room_type:[\s\S]*style:[\s\S]*mode:/);
  assert.match(generator, /await uploadRoomImage\([\s\S]*trackEvent\("image_upload_success"[\s\S]*file_type:[\s\S]*file_size:/);
  assert.match(generator, /if \(!data\.jobId\)[\s\S]*trackEvent\("generation_started"[\s\S]*room_type:[\s\S]*style:[\s\S]*plan:/);
  assert.match(generator, /job\.status === "completed"[\s\S]*trackEvent\("generation_completed"[\s\S]*duration:[\s\S]*plan:/);
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
