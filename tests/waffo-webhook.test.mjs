import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPaymentProduct } from "../lib/payments/catalog.ts";
import { insertPaymentGrantOnce, oneTimeGrantKey, subscriptionGrantKey } from "../lib/payments/idempotency.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Waffo webhook verifies raw production signatures before claiming any event", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.ok(route.indexOf("await request.text()") < route.indexOf("verifyWebhook<WebhookEventData>"));
  assert.match(route, /request\.headers\.get\("x-waffo-signature"\)/);
  assert.match(route, /verifyWebhook<WebhookEventData>\(rawBody, signature, \{ environment: "prod" \}\)/);
  assert.match(route, /event\.mode !== "prod"/);
  assert.ok(route.indexOf("verifyWebhook<WebhookEventData>") < route.indexOf('provider: "waffo"'));
});

test("all required production Waffo events are explicitly dispatched", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  for (const event of [
    "OrderCompleted",
    "SubscriptionActivated",
    "SubscriptionPaymentSucceeded",
    "SubscriptionRenewed",
    "SubscriptionRecovered",
    "SubscriptionCanceling",
    "SubscriptionUncanceled",
    "SubscriptionCanceled",
    "SubscriptionPastDue",
    "RefundSucceeded",
    "RefundFailed",
  ]) assert.match(route, new RegExp(`case WebhookEventType\\.${event}:`));
  assert.match(route, /default:\s+return "ignored"/);
});

test("one-time Credit Pack is server-authoritative and grants exactly 30 for a paid completed order", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  const catalog = getPaymentProduct("credits");
  assert.equal(catalog.type, "one_time");
  assert.equal(catalog.credits, 30);
  assert.equal(catalog.expiresInDays, 365);
  assert.match(route, /orderStatus !== "completed" \|\| event\.data\.paymentStatus !== "succeeded"/);
  assert.match(route, /grantOneTimeCredits\(\{/);
  assert.match(route, /providerOrderId: event\.data\.orderId/);
});

test("Starter and Pro activation grant catalog credits and persist the signed period", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.equal(getPaymentProduct("starter").creditsPerPeriod, 20);
  assert.equal(getPaymentProduct("starter").commercialLicense, false);
  assert.equal(getPaymentProduct("starter").priorityQueue, false);
  assert.equal(getPaymentProduct("pro").creditsPerPeriod, 60);
  assert.equal(getPaymentProduct("pro").commercialLicense, true);
  assert.equal(getPaymentProduct("pro").priorityQueue, true);
  assert.match(route, /SubscriptionActivated:\s+return fulfillSubscriptionPeriod\(event, "activated"\)/);
  assert.match(route, /currentPeriodStart: period\.start/);
  assert.match(route, /currentPeriodEnd: period\.end/);
  assert.match(route, /grantSubscriptionPeriod\(\{/);
});

test("only activated and renewed events can provision subscription period credits", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  const dispatch = route.slice(route.indexOf("async function dispatchEvent"), route.indexOf("async function fulfillOneTimeOrder"));
  const payment = route.slice(route.indexOf("async function auditSubscriptionPayment"), route.indexOf("async function syncSubscriptionState"));
  const state = route.slice(route.indexOf("async function syncSubscriptionState"), route.indexOf("async function handleRefund"));
  assert.match(dispatch, /SubscriptionActivated[\s\S]*fulfillSubscriptionPeriod\(event, "activated"\)/);
  assert.match(dispatch, /SubscriptionRenewed[\s\S]*fulfillSubscriptionPeriod\(event, "renewed"\)/);
  assert.doesNotMatch(payment, /grantSubscriptionPeriod|subscriptionPeriod\(/);
  assert.match(payment, /recorded without credit grant/);
  assert.doesNotMatch(state, /grantSubscriptionPeriod|grantOneTimeCredits/);
  assert.match(state, /without credit grant/);
});

test("subscription period grants deduplicate activation and renewal replays without resetting spend", async () => {
  const firstKey = subscriptionGrantKey({ subscriptionId: "ORD_subscription", periodStart: "2026-09-01T00:00:00.000Z" });
  const renewalKey = subscriptionGrantKey({ subscriptionId: "ORD_subscription", periodStart: "2026-10-01T00:00:00.000Z" });
  assert.equal(firstKey, "subscription:ORD_subscription:period:2026-09-01T00:00:00.000Z");
  assert.equal(renewalKey, "subscription:ORD_subscription:period:2026-10-01T00:00:00.000Z");
  const grants = new Map();
  async function insert(key, total) {
    return insertPaymentGrantOnce({
      insert: async () => grants.has(key)
        ? { data: null, error: { code: "23505" } }
        : (grants.set(key, { key, credits_remaining: total }), { data: grants.get(key), error: null }),
      findExisting: async () => ({ data: grants.get(key), error: null }),
    });
  }
  await insert(firstKey, 20);
  grants.get(firstKey).credits_remaining = 13;
  const replay = await insert(firstKey, 20);
  assert.equal(replay.created, false);
  assert.equal(replay.grant.credits_remaining, 13);
  const renewal = await insert(renewalKey, 20);
  assert.equal(renewal.created, true);
  assert.equal(grants.size, 2);
});

test("payment_succeeded plus activated or renewed cannot double-grant", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  const payment = route.slice(route.indexOf("async function auditSubscriptionPayment"), route.indexOf("async function syncSubscriptionState"));
  assert.doesNotMatch(payment, /grantSubscriptionPeriod|grantOneTimeCredits|currentPeriodEnd|currentPeriodStart/);
  assert.match(payment, /paymentStatus !== "succeeded"/);
  assert.match(payment, /recordOrder\(event, context, "payment_succeeded"\)/);
});

test("past due and recovery update status without issuing credits", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.match(route, /SubscriptionPastDue:\s+return syncSubscriptionState\(event, "past_due", "past_due"\)/);
  assert.match(route, /SubscriptionRecovered:\s+return syncSubscriptionState\(event, "active", "active"\)/);
  const state = route.slice(route.indexOf("async function syncSubscriptionState"), route.indexOf("async function handleRefund"));
  assert.doesNotMatch(state, /grantSubscriptionPeriod|grantOneTimeCredits/);
});

test("canceling remains active through current period while canceled becomes inactive", async () => {
  const [route, fulfillment, entitlements] = await Promise.all([
    read("app/api/waffo/webhook/route.ts"),
    read("lib/payments/fulfillment.ts"),
    read("lib/entitlements/rules.ts"),
  ]);
  assert.match(route, /SubscriptionCanceling:\s+return syncSubscriptionState\(event, "scheduled_cancel", "canceling"\)/);
  assert.match(route, /SubscriptionUncanceled:\s+return syncSubscriptionState\(event, "active", "active"\)/);
  assert.match(route, /SubscriptionCanceled:\s+return syncSubscriptionState\(event, "canceled", "canceled"\)/);
  assert.match(fulfillment, /input\.status === "scheduled_cancel" \? "active" : input\.status/);
  assert.match(entitlements, /subscription\.status === "active" \|\| subscription\.status === "trialing"/);
});

test("successful one-time refunds zero only the associated remaining grant and failed refunds do nothing", async () => {
  const [route, fulfillment] = await Promise.all([
    read("app/api/waffo/webhook/route.ts"),
    read("lib/payments/fulfillment.ts"),
  ]);
  assert.match(route, /if \(!succeeded\)[\s\S]*return "recorded"/);
  assert.match(route, /markPaymentOrderRefunded\(\{/);
  assert.match(route, /revokeOneTimeCreditsForRefund\(\{/);
  assert.match(fulfillment, /\.update\(\{ credits_remaining: 0 \}\)/);
  assert.match(fulfillment, /\.eq\("provider_grant_key", oneTimeGrantKey\(input\.providerOrderId\)\)/);
  assert.doesNotMatch(fulfillment, /credits_remaining:\s*-/);
  assert.match(route, /subscription refund left entitlement unchanged pending authoritative subscription state/);
});

test("signed metadata, server product mapping, user ownership, and checkout reference remain fail-closed", async () => {
  const route = await read("app/api/waffo/webhook/route.ts");
  assert.match(route, /metadata\.waffo_product_id \?\? metadata\.product_id/);
  assert.match(route, /getPaymentProductKeyByWaffoId\(actualProductId\)/);
  assert.match(route, /metadata\.product_key !== productKey/);
  assert.match(route, /UUID\.test\(userId\)/);
  assert.match(route, /checkoutReference !== event\.data\.orderMerchantExternalId/);
  const oneTime = route.slice(route.indexOf("async function fulfillOneTimeOrder"), route.indexOf("async function fulfillSubscriptionPeriod"));
  assert.ok(oneTime.indexOf("await trustedContext(event)") < oneTime.indexOf("grantOneTimeCredits({"));
  assert.match(route, /getUserById\(userId\)/);
  assert.doesNotMatch(route, /canUsePaymentTest|PAYMENTS_TEST_MODE|PAYMENTS_TEST_EMAILS|PAYMENTS_LIVE/);
});

test("unknown products are safely ignored and delivery events are independently idempotent", async () => {
  const [route, events] = await Promise.all([
    read("app/api/waffo/webhook/route.ts"),
    read("lib/payments/events.ts"),
  ]);
  assert.match(route, /if \(!productKey\)[\s\S]*return null/);
  assert.match(route, /beginPaymentEvent\(\{ provider: "waffo", eventId: event\.id/);
  assert.match(events, /admin\.rpc\("begin_payment_event"/);
});

test("same one-time order cannot reset a partially spent balance", async () => {
  const key = oneTimeGrantKey("ORD_same");
  let stored = null;
  const insert = async () => stored
    ? { data: null, error: { code: "23505" } }
    : (stored = { key, credits_remaining: 30 }, { data: stored, error: null });
  const findExisting = async () => ({ data: stored, error: null });
  await insertPaymentGrantOnce({ insert, findExisting });
  stored.credits_remaining = 21;
  const replay = await insertPaymentGrantOnce({ insert, findExisting });
  assert.deepEqual(replay, { created: false, grant: { key, credits_remaining: 21 } });
});

test("Waffo environment variables are server-only and payment flags stay closed", async () => {
  const env = await read(".env.example");
  for (const line of [
    "NEXT_PUBLIC_PAYMENTS_LIVE=false",
    "PAYMENTS_LIVE=false",
    "PAYMENTS_TEST_MODE=false",
    "WAFFO_MERCHANT_ID=",
    "WAFFO_PRIVATE_KEY=",
    "WAFFO_PRIVATE_KEY_BASE64=",
    "WAFFO_PRODUCT_CREDIT_PACK=",
    "WAFFO_PRODUCT_STARTER=",
    "WAFFO_PRODUCT_PRO=",
    "WAFFO_PRODUCT_TEST_CREDITS=",
  ]) assert.match(env, new RegExp(`^${line}$`, "m"));
  assert.doesNotMatch(env, /NEXT_PUBLIC_WAFFO_/);
});

test("account exposes current plan, credits, subscription status, and period end without URL fulfillment", async () => {
  const [page, status] = await Promise.all([
    read("app/account/page.tsx"),
    read("components/account/payment-status.tsx"),
  ]);
  assert.match(page, /Current plan/);
  assert.match(page, /Total available/);
  assert.match(page, /Subscription status/);
  assert.match(page, /subscriptionCurrentPeriodEnd/);
  assert.match(status, /fetch\("\/api\/entitlements"/);
  assert.doesNotMatch(`${page}\n${status}`, /grantOneTimeCredits|grantSubscriptionPeriod|recordPaymentOrder/);
});
