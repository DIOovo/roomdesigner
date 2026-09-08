import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCreemProductId, getPaymentProduct, isPaymentProductEnabled, paymentProductKeys } from "../lib/payments/catalog.ts";

test("payment catalog defines every server-authoritative product entitlement", () => {
  assert.deepEqual(paymentProductKeys, ["starter", "pro", "credits", "test_credits"]);
  const starter = getPaymentProduct("starter");
  const pro = getPaymentProduct("pro");
  const credits = getPaymentProduct("credits");
  const testCredits = getPaymentProduct("test_credits");
  assert.deepEqual([starter.type, starter.interval, starter.creditsPerPeriod, starter.commercialLicense, starter.priorityQueue], ["subscription", "month", 20, false, false]);
  assert.deepEqual([pro.type, pro.interval, pro.creditsPerPeriod, pro.commercialLicense, pro.priorityQueue], ["subscription", "month", 60, true, true]);
  assert.deepEqual([credits.type, credits.credits, credits.expiresInDays, credits.commercialLicense, credits.priorityQueue], ["one_time", 30, 365, false, false]);
  assert.deepEqual([testCredits.type, testCredits.credits, testCredits.commercialLicense, testCredits.priorityQueue], ["one_time", 5, false, false]);
  for (const key of paymentProductKeys) assert.equal(getPaymentProduct(key).currency, "USD");
});

test("test credits are hidden by default and require an exact server-side test flag", () => {
  assert.equal(isPaymentProductEnabled("starter", "false"), true);
  assert.equal(isPaymentProductEnabled("test_credits", undefined), false);
  assert.equal(isPaymentProductEnabled("test_credits", "false"), false);
  assert.equal(isPaymentProductEnabled("test_credits", "TRUE"), false);
  assert.equal(isPaymentProductEnabled("test_credits", "true"), true);
  assert.throws(() => getCreemProductId("test_credits", { CREEM_PRODUCT_TEST_CREDITS: "prod_test", PAYMENTS_TEST_MODE: "false" }), /not enabled/);
  assert.equal(getCreemProductId("test_credits", { CREEM_PRODUCT_TEST_CREDITS: "prod_test", PAYMENTS_TEST_MODE: "true" }), "prod_test");
});

test("test credits are not exposed by the public pricing UI", async () => {
  const publicPricing = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pricing/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/pricing/checkout-button.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(publicPricing.join("\n"), /test_credits|CREEM_PRODUCT_TEST_CREDITS/);
});

test("Creem product IDs stay in server-only environment mappings", () => {
  assert.equal(getCreemProductId("starter", { CREEM_PRODUCT_STARTER: "prod_starter" }), "prod_starter");
  assert.throws(() => getCreemProductId("pro", {}), /CREEM_PRODUCT_PRO is not configured/);
});
