import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canUsePaymentTest } from "../lib/payments/availability.ts";
import { getCreemProductId } from "../lib/payments/catalog.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("test checkout requires exact test mode and a case-insensitive server allowlist", () => {
  const allowed = { PAYMENTS_TEST_MODE: "true", PAYMENTS_TEST_EMAILS: "first@example.com, Test@Example.com " };
  assert.equal(canUsePaymentTest("test@example.com", allowed), true);
  assert.equal(canUsePaymentTest("other@example.com", allowed), false);
  assert.equal(canUsePaymentTest("test@example.com", { ...allowed, PAYMENTS_TEST_MODE: "false" }), false);
  assert.equal(canUsePaymentTest("test@example.com", { ...allowed, PAYMENTS_TEST_MODE: "TRUE" }), false);
});

test("checkout route authenticates and keeps only the formal credit pack behind the public payment gate", async () => {
  const route = await read("app/api/creem/checkout/route.ts");
  const auth = route.indexOf("if (!user)");
  assert.ok(auth > -1 && auth < route.indexOf("PAYMENTS_LIVE"));
  assert.match(route, /status: 401/);
  assert.match(route, /body\.productKey !== "credits"/);
  assert.match(route, /if \(!isPaymentsLive\(process\.env\.PAYMENTS_LIVE\)\)/);
  assert.match(route, /Payments are temporarily unavailable\./);
  assert.doesNotMatch(route, /canUsePaymentTest|body\.productKey !== "test_credits"|productKey === "test_credits"/);
  assert.doesNotMatch(route, /body\.productKey === "(?:starter|pro)"/);
});

test("checkout rejects client-controlled identity, amount, credits, and product IDs", async () => {
  const route = await read("app/api/creem/checkout/route.ts");
  assert.match(route, /Object\.keys\(body\)\.some\(\(key\) => key !== "productKey"\)/);
  assert.match(route, /Only productKey is accepted\./);
  assert.doesNotMatch(route, /body\.(userId|email|amount|credits|productId)/);
  assert.match(route, /getCreemProductId\(productKey\)/);
  assert.equal(getCreemProductId("test_credits", { PAYMENTS_TEST_MODE: "true", CREEM_PRODUCT_TEST_CREDITS: "prod_test" }), "prod_test");
});

test("Creem client uses fixed official bases and sends only server-built checkout data", async () => {
  const client = await read("lib/payments/providers/creem.ts");
  assert.match(client, /https:\/\/test-api\.creem\.io/);
  assert.match(client, /https:\/\/api\.creem\.io/);
  assert.match(client, /"x-api-key": apiKey/);
  assert.match(client, /product_id: input\.productId/);
  assert.match(client, /units: 1/);
  assert.match(client, /customer: \{ email: input\.email \}/);
  assert.match(client, /metadata: \{ user_id: input\.userId, product_key: input\.productKey \}/);
  assert.match(client, /success_url: input\.successUrl/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_CREEM/);
});

test("test pack stays account-only and is never exposed in public pricing", async () => {
  const [account, card, homepage, pricing, button] = await Promise.all([
    read("app/account/page.tsx"), read("components/account/payment-test-card.tsx"), read("app/page.tsx"), read("app/pricing/page.tsx"), read("components/pricing/checkout-button.tsx"),
  ]);
  assert.match(account, /canUsePaymentTest\(user\.email\) \? <PaymentTestCard/);
  assert.match(card, /Test Credit Pack/);
  assert.match(card, /5 credits/);
  assert.match(card, /productKey: "test_credits"/);
  assert.doesNotMatch([homepage, pricing, button].join("\n"), /test_credits|Test Credit Pack|5 credits/);
});

test("public subscriptions remain gated while only Credit Pack can reach Creem", async () => {
  const button = await read("components/pricing/checkout-button.tsx");
  assert.match(button, /if \(!paymentsLive \|\| plan !== "credits"\)/);
  assert.match(button, /Payments are opening soon/);
  assert.match(button, /fetch\("\/api\/creem\/checkout"/);
  assert.doesNotMatch(button, /fetch\("\/api\/stripe\/checkout"/);
});
