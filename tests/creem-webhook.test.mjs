import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPaymentProduct, getPaymentProductKeyByCreemId } from "../lib/payments/catalog.ts";
import { insertPaymentGrantOnce, oneTimeGrantKey } from "../lib/payments/idempotency.ts";
import { verifyCreemWebhookSignature } from "../lib/payments/providers/creem-signature.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Creem webhook signature verifies the raw body with HMAC-SHA256", () => {
  const raw = JSON.stringify({ id: "evt_1", eventType: "checkout.completed" });
  const secret = "webhook-secret";
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifyCreemWebhookSignature(raw, null, secret), "missing");
  assert.equal(verifyCreemWebhookSignature(raw, "not-hex", secret), "malformed");
  assert.equal(verifyCreemWebhookSignature(raw, "0".repeat(64), secret), "invalid");
  assert.equal(verifyCreemWebhookSignature(raw, signature, secret), "valid");
  assert.equal(verifyCreemWebhookSignature(raw, signature, undefined), "unconfigured");
});

test("webhook claims checkout.completed before order and grant fulfillment", async () => {
  const route = await read("app/api/creem/webhook/route.ts");
  assert.ok(route.indexOf("await request.text()") < route.indexOf("JSON.parse(rawBody)"));
  assert.ok(route.indexOf("const signatureResult = verifyCreemWebhookSignature") < route.indexOf("claim = await beginPaymentEvent"));
  assert.ok(route.indexOf("claim = await beginPaymentEvent") < route.indexOf("await fulfillCheckout(event)"));
  assert.match(route, /event\.eventType === "checkout\.completed"/);
  assert.match(route, /recordPaymentOrder\(/);
  assert.match(route, /grantOneTimeCredits\(/);
  assert.match(route, /markPaymentEventProcessed/);
  assert.match(route, /markPaymentEventFailed/);
});

test("actual signed Creem product ID is authoritative over metadata", async () => {
  const env = { CREEM_PRODUCT_CREDIT_PACK: "prod_credits", CREEM_PRODUCT_TEST_CREDITS: "prod_test" };
  assert.equal(getPaymentProductKeyByCreemId("prod_credits", env), "credits");
  assert.equal(getPaymentProductKeyByCreemId("prod_test", env), "test_credits");
  assert.equal(getPaymentProductKeyByCreemId("prod_unknown", env), null);
  const route = await read("app/api/creem/webhook/route.ts");
  assert.match(route, /getPaymentProductKeyByCreemId\(orderProductId\)/);
  assert.match(route, /metadata\.product_key !== productKey/);
  assert.match(route, /Checkout metadata does not match the paid product/);
  assert.match(route, /Checkout and order product IDs do not match/);
});

test("catalog fixes Credit Pack at 30 and Test Pack at 5", () => {
  assert.equal(getPaymentProduct("credits").credits, 30);
  assert.equal(getPaymentProduct("test_credits").credits, 5);
});

test("same order across events is insert-only and cannot restore spent credits", async () => {
  const key = oneTimeGrantKey("ord_same");
  let stored = null;
  const insert = async () => stored ? { data: null, error: { code: "23505" } } : (stored = { key, credits_remaining: 30 }, { data: stored, error: null });
  const first = await insertPaymentGrantOnce({ insert, findExisting: async () => ({ data: stored, error: null }) });
  assert.equal(first.created, true);
  stored.credits_remaining = 21;
  const replay = await insertPaymentGrantOnce({ insert, findExisting: async () => ({ data: stored, error: null }) });
  assert.deepEqual(replay, { created: false, grant: { key, credits_remaining: 21 } });
});

test("webhook validates a real UUID user without rechecking mutable test gates", async () => {
  const [route, fulfillment] = await Promise.all([read("app/api/creem/webhook/route.ts"), read("lib/payments/fulfillment.ts")]);
  assert.match(route, /UUID\.test\(userId\)/);
  assert.match(route, /admin\.auth\.admin\.getUserById\(userId\)/);
  assert.match(route, /console\.warn\("Creem checkout customer email differs from account email"/);
  assert.doesNotMatch(route, /canUsePaymentTest|PAYMENTS_TEST_MODE|PAYMENTS_TEST_EMAILS/);
  assert.ok(route.indexOf("getUserById(userId)") < route.indexOf("grantOneTimeCredits({"));
  const oneTime = fulfillment.slice(fulfillment.indexOf("export async function grantOneTimeCredits"), fulfillment.indexOf("export async function syncPaidSubscription"));
  assert.match(oneTime, /getPaymentProduct\(input\.productKey\)/);
  assert.doesNotMatch(oneTime, /getEnabledPaymentProduct|PAYMENTS_TEST_MODE|PAYMENTS_TEST_EMAILS/);
});

test("paid test checkout still fulfills after test mode is turned off", async () => {
  const [route, fulfillment] = await Promise.all([read("app/api/creem/webhook/route.ts"), read("lib/payments/fulfillment.ts")]);
  assert.match(route, /productKey !== "credits" && productKey !== "test_credits"/);
  assert.doesNotMatch(route, /PAYMENTS_TEST_MODE/);
  assert.match(fulfillment, /const product = getPaymentProduct\(input\.productKey\)/);
  assert.equal(getPaymentProduct("test_credits").credits, 5);
});

test("paid test checkout still fulfills after its email leaves the allowlist", async () => {
  const route = await read("app/api/creem/webhook/route.ts");
  assert.doesNotMatch(route, /canUsePaymentTest|PAYMENTS_TEST_EMAILS/);
  assert.match(route, /admin\.auth\.admin\.getUserById\(userId\)/);
  assert.match(route, /grantOneTimeCredits\(/);
});

test("customer email mismatch warns but does not reject a signed paid order", async () => {
  const route = await read("app/api/creem/webhook/route.ts");
  const mismatch = route.slice(route.indexOf("const customerEmail"), route.indexOf("const amount"));
  assert.match(mismatch, /console\.warn/);
  assert.doesNotMatch(mismatch, /throw new Error|return NextResponse/);
  assert.ok(route.indexOf("const customerEmail") < route.indexOf("grantOneTimeCredits({"));
});

test("success return state only polls entitlements and never grants credit", async () => {
  const [page, status] = await Promise.all([read("app/account/page.tsx"), read("components/account/payment-status.tsx")]);
  assert.match(page, /params\.checkout === "success"/);
  assert.match(status, /Payment received/);
  assert.match(status, /Payment confirmed/);
  assert.match(status, /0, 1_000, 2_000, 4_000, 8_000/);
  assert.match(status, /fetch\("\/api\/entitlements"/);
  assert.doesNotMatch(`${page}\n${status}`, /grantOneTimeCredits|credit_grants|recordPaymentOrder/);
});
