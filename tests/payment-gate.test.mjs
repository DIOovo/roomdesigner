import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isPaymentsLive } from "../lib/payments/availability.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("payment availability is fail-closed unless the flag is exactly true", () => {
  assert.equal(isPaymentsLive(undefined), false);
  assert.equal(isPaymentsLive("false"), false);
  assert.equal(isPaymentsLive("TRUE"), false);
  assert.equal(isPaymentsLive("true"), true);
});

test("all paid plan buttons share the availability modal and free remains a generator link", async () => {
  const [button, homepage, pricing] = await Promise.all([
    read("components/pricing/checkout-button.tsx"),
    read("app/page.tsx"),
    read("app/pricing/page.tsx"),
  ]);
  assert.match(button, /NEXT_PUBLIC_PAYMENTS_LIVE/);
  assert.match(button, /Payments are opening soon/);
  assert.match(button, /Starter, Pro, and Credit Pack purchases/);
  assert.match(button, /setAvailabilityOpen\(true\)/);
  assert.match(button, /if \(!paymentsLive\)[\s\S]*?setAvailabilityOpen\(true\)[\s\S]*?return;/);
  assert.match(button, /if \(event\.key === "Escape"\)/);
  assert.match(button, /event\.target === event\.currentTarget/);
  assert.match(button, /aria-modal="true"/);
  assert.match(button, /aria-labelledby=\{titleId\}/);
  assert.match(button, /event\.key !== "Tab"/);
  assert.match(button, /scrollIntoView/);
  assert.match(button, /router\.push\("\/#generator"\)/);
  assert.ok(button.indexOf("if (!paymentsLive)") < button.indexOf('fetch("/api/waffo/checkout"'));
  assert.match(button, /productKey: plan/);
  assert.match(homepage, /<CheckoutButton/);
  assert.match(homepage, /plan=\{plan\.name === "Starter" \? "starter" : plan\.name === "Pro" \? "pro" : "credits"\}/);
  assert.match(homepage, />Choose plan<\/CheckoutButton>/);
  assert.match(homepage, /href="#generator"/);
  for (const plan of ['"starter"', '"pro"', '"credits"']) assert.match(pricing, new RegExp(`plan: ${plan}`));
  assert.match(pricing, /href="\/#generator"/);
});

test("checkout API rejects before Stripe can be initialized or create a session", async () => {
  const route = await read("app/api/stripe/checkout/route.ts");
  const guard = route.indexOf("PAYMENTS_LIVE");
  const stripeInitialization = route.indexOf("getStripe()");
  const sessionCreation = route.indexOf("stripe.checkout.sessions.create");
  assert.ok(guard > -1);
  assert.ok(guard < stripeInitialization);
  assert.ok(guard < sessionCreation);
  assert.match(route, /Payments are temporarily unavailable\./);
  assert.match(route, /status: 503/);
});

test("environment example documents both payment availability flags as false", async () => {
  const env = await read(".env.example");
  assert.match(env, /# Keep both false until production payments are ready\./);
  assert.match(env, /^NEXT_PUBLIC_PAYMENTS_LIVE=false$/m);
  assert.match(env, /^PAYMENTS_LIVE=false$/m);
});
