import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPaymentProduct } from "../lib/payments/catalog.ts";
import { insertPaymentGrantOnce, oneTimeGrantKey } from "../lib/payments/idempotency.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Waffo webhook verifies the raw body with the official production verifier before parsing or claiming", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.ok(route.indexOf("await request.text()") < route.indexOf("verifyWebhook<WebhookEventData>"));
  assert.match(route, /request\.headers\.get\("x-waffo-signature"\)/);
  assert.match(route, /if \(!signature\).*status: 401/);
  assert.match(route, /verifyWebhook<WebhookEventData>\(rawBody, signature, \{ environment: "prod" \}\)/);
  assert.match(route, /Invalid Waffo signature/);
  assert.ok(route.indexOf("verifyWebhook<WebhookEventData>") < route.indexOf('provider: "waffo"'));
});

test("only a successful production order.completed can reach Waffo fulfillment", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.match(route, /event\.mode !== "prod"/);
  assert.match(route, /event\.eventType === WebhookEventType\.OrderCompleted/);
  assert.match(route, /data\.orderStatus !== "completed" \|\| data\.paymentStatus !== "succeeded"/);
  assert.match(route, /recordPaymentOrder\(\{/);
  assert.match(route, /grantOneTimeCredits\(\{/);
  assert.equal(getPaymentProduct("test_credits").credits, 5);
});

test("signed server metadata binds Waffo product, user, and checkout ownership", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.match(route, /if \(!metadata\) throw new Error\("The Waffo order metadata is missing\."\)/);
  assert.match(route, /const actualProductId = metadata\.product_id\?\.trim\(\)/);
  assert.match(route, /getPaymentProductKeyByWaffoId\(actualProductId\)/);
  assert.match(route, /productKey !== "test_credits"/);
  assert.match(route, /metadata\.product_key !== productKey/);
  assert.match(route, /UUID\.test\(userId\)/);
  assert.match(route, /checkoutReference !== data\.orderMerchantExternalId/);
  assert.ok(route.indexOf("getUserById(userId)") < route.indexOf("grantOneTimeCredits({"));
  assert.doesNotMatch(route, /canUsePaymentTest|PAYMENTS_TEST_MODE|PAYMENTS_TEST_EMAILS/);
});

test("unknown Waffo products are acknowledged without fulfillment", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  const unknownProduct = route.slice(route.indexOf('if (productKey !== "test_credits")'), route.indexOf("if (metadata.product_key"));
  assert.match(unknownProduct, /return "ignored"/);
  assert.doesNotMatch(unknownProduct, /grantOneTimeCredits|recordPaymentOrder/);
});

test("Waffo delivery events and provider orders have separate idempotency boundaries", async () => {
  const [route, events, fulfillment] = await Promise.all([
    read("app/api/waffo/webhook/route.ts"),
    read("lib/payments/events.ts"),
    read("lib/payments/fulfillment.ts"),
  ]);
  assert.match(route, /beginPaymentEvent\(\{ provider: "waffo", eventId: event\.id/);
  assert.match(route, /providerOrderId: data\.orderId/);
  assert.match(events, /admin\.rpc\("begin_payment_event"/);
  assert.match(fulfillment, /provider_grant_key: oneTimeGrantKey\(input\.providerOrderId\)/);
});

test("same Waffo order across events is insert-only and replay cannot restore spent credits", async () => {
  const key = oneTimeGrantKey("ORD_same");
  let stored = null;
  const insert = async () => stored
    ? { data: null, error: { code: "23505" } }
    : (stored = { key, credits_remaining: 5 }, { data: stored, error: null });
  const findExisting = async () => ({ data: stored, error: null });
  const first = await insertPaymentGrantOnce({ insert, findExisting });
  assert.equal(first.created, true);
  stored.credits_remaining = 2;
  const secondEventForOrder = await insertPaymentGrantOnce({ insert, findExisting });
  assert.deepEqual(secondEventForOrder, { created: false, grant: { key, credits_remaining: 2 } });
  const replay = await insertPaymentGrantOnce({ insert, findExisting });
  assert.deepEqual(replay, { created: false, grant: { key, credits_remaining: 2 } });
});

test("Waffo environment variables are server-only and public payment flags stay closed", async () => {
  const env = await read(".env.example");
  for (const line of [
    "NEXT_PUBLIC_PAYMENTS_LIVE=false",
    "PAYMENTS_LIVE=false",
    "PAYMENTS_TEST_MODE=false",
    "WAFFO_MERCHANT_ID=",
    "WAFFO_PRIVATE_KEY=",
    "WAFFO_PRODUCT_TEST_CREDITS=",
  ]) assert.match(env, new RegExp(`^${line}$`, "m"));
  assert.doesNotMatch(env, /NEXT_PUBLIC_WAFFO_/);
});
