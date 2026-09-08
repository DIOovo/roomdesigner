import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canUsePaymentTest } from "../lib/payments/availability.ts";
import { getPaymentProductKeyByWaffoId, getWaffoProductId } from "../lib/payments/catalog.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Waffo test checkout remains authenticated, test-only, and allowlisted", async () => {
  const route = await read("app/api/waffo/checkout/route.ts");
  const auth = route.indexOf("if (!user)");
  const allowlist = route.indexOf("if (!canUsePaymentTest(user.email))");
  const checkout = route.indexOf("await createWaffoCheckout");
  assert.ok(auth > -1 && auth < allowlist && allowlist < checkout);
  assert.match(route, /status: 401/);
  assert.match(route, /body\.productKey !== "test_credits"/);
  assert.match(route, /status: 403/);
  assert.equal(canUsePaymentTest("qa@example.com", { PAYMENTS_TEST_MODE: "true", PAYMENTS_TEST_EMAILS: "QA@example.com" }), true);
  assert.equal(canUsePaymentTest("qa@example.com", { PAYMENTS_TEST_MODE: "false", PAYMENTS_TEST_EMAILS: "qa@example.com" }), false);
  assert.equal(canUsePaymentTest("other@example.com", { PAYMENTS_TEST_MODE: "true", PAYMENTS_TEST_EMAILS: "qa@example.com" }), false);
});

test("Waffo checkout accepts only productKey and resolves the product ID server-side", async () => {
  const [route, provider] = await Promise.all([
    read("app/api/waffo/checkout/route.ts"),
    read("lib/payments/providers/waffo.ts"),
  ]);
  assert.match(route, /Object\.keys\(body\)\.some\(\(key\) => key !== "productKey"\)/);
  assert.match(route, /getWaffoProductId\("test_credits"\)/);
  assert.doesNotMatch(route, /body\.(userId|email|amount|currency|credits|productId)/);
  assert.match(provider, /productId: input\.productId/);
  assert.match(provider, /currency: "USD"/);
  assert.match(provider, /metadata: \{/);
  assert.match(provider, /user_id: input\.userId/);
  assert.match(provider, /product_id: input\.productId/);
  assert.doesNotMatch(provider, /NEXT_PUBLIC_WAFFO/);
});

test("Waffo product mapping is fail-closed and limited to the hidden test pack", () => {
  const enabled = { PAYMENTS_TEST_MODE: "true", WAFFO_PRODUCT_TEST_CREDITS: "PROD_test" };
  assert.equal(getWaffoProductId("test_credits", enabled), "PROD_test");
  assert.equal(getPaymentProductKeyByWaffoId("PROD_test", enabled), "test_credits");
  assert.equal(getPaymentProductKeyByWaffoId("PROD_unknown", enabled), null);
  assert.throws(() => getWaffoProductId("test_credits", { PAYMENTS_TEST_MODE: "false", WAFFO_PRODUCT_TEST_CREDITS: "PROD_test" }), /not enabled/);
  assert.throws(() => getWaffoProductId("credits", { PAYMENTS_TEST_MODE: "true" }), /not available through Waffo/);
});

test("account test entry opens Waffo checkout in a new tab and remains absent from public pricing", async () => {
  const [account, card, homepage, pricing] = await Promise.all([
    read("app/account/page.tsx"),
    read("components/account/payment-test-card.tsx"),
    read("app/page.tsx"),
    read("app/pricing/page.tsx"),
  ]);
  assert.match(account, /canUsePaymentTest\(user\.email\) \? <PaymentTestCard/);
  assert.match(card, /fetch\("\/api\/waffo\/checkout"/);
  assert.match(card, /productKey: "test_credits"/);
  assert.match(card, /window\.open\(data\.checkoutUrl, "_blank", "noopener,noreferrer"\)/);
  assert.doesNotMatch(`${homepage}\n${pricing}`, /Test Credit Pack|test_credits|US\$1\.00/);
});

test("Waffo success return only refreshes account state and never fulfills credits", async () => {
  const [route, page, status] = await Promise.all([
    read("app/api/waffo/checkout/route.ts"),
    read("app/account/page.tsx"),
    read("components/account/payment-status.tsx"),
  ]);
  assert.match(route, /successUrl: `\$\{resolveSiteUrl\(\)\}\/account\?checkout=success`/);
  assert.match(page, /params\.checkout === "success"/);
  assert.match(status, /fetch\("\/api\/entitlements"/);
  assert.doesNotMatch(`${page}\n${status}`, /grantOneTimeCredits|recordPaymentOrder|credit_grants/);
});

test("Waffo integration leaves Stripe and Creem provider implementations isolated", async () => {
  const [stripeCheckout, stripeWebhook, creemCheckout, creemWebhook] = await Promise.all([
    read("app/api/stripe/checkout/route.ts"),
    read("app/api/stripe/webhook/route.ts"),
    read("app/api/creem/checkout/route.ts"),
    read("app/api/creem/webhook/route.ts"),
  ]);
  assert.doesNotMatch(`${stripeCheckout}\n${stripeWebhook}\n${creemCheckout}\n${creemWebhook}`, /waffo|Waffo/);
  assert.doesNotMatch(creemCheckout, /test_credits/);
  assert.match(creemWebhook, /productKey !== "credits" && productKey !== "test_credits"/);
});
