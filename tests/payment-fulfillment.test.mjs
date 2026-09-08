import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { insertPaymentGrantOnce, oneTimeGrantKey, subscriptionGrantKey } from "../lib/payments/idempotency.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("business grant keys deduplicate orders and subscription periods", () => {
  assert.equal(oneTimeGrantKey("ord_123"), oneTimeGrantKey("ord_123"));
  assert.equal(subscriptionGrantKey({ subscriptionId: "sub_1", transactionId: "tx_1" }), "subscription:sub_1:transaction:tx_1");
  assert.equal(subscriptionGrantKey({ subscriptionId: "sub_1", periodStart: "2026-09-01" }), "subscription:sub_1:period:2026-09-01");
  assert.throws(() => subscriptionGrantKey({ subscriptionId: "sub_1" }), /transaction ID or billing period start/);
  const seen = new Set([oneTimeGrantKey("ord_123")]);
  assert.equal(seen.has(oneTimeGrantKey("ord_123")), true);
});

test("duplicate grants are insert-only and never reset a spent balance", async () => {
  let grant = null;
  const insert = async () => {
    if (grant) return { data: null, error: { code: "23505" } };
    grant = { key: "order:ord_123", credits_remaining: 30 };
    return { data: grant, error: null };
  };
  const findExisting = async () => ({ data: grant, error: null });
  const first = await insertPaymentGrantOnce({ insert, findExisting });
  assert.equal(first.created, true);
  grant.credits_remaining -= 3;
  const duplicate = await insertPaymentGrantOnce({ insert, findExisting });
  assert.deepEqual(duplicate, { created: false, grant: { key: "order:ord_123", credits_remaining: 27 } });

  const source = await read("lib/payments/fulfillment.ts");
  const insertGrant = source.slice(source.indexOf("async function insertCreditGrant"), source.indexOf("function requireAdmin"));
  assert.match(insertGrant, /\.insert\(row\)/);
  assert.match(insertGrant, /insertPaymentGrantOnce/);
  assert.doesNotMatch(insertGrant, /\.upsert\(/);
  assert.doesNotMatch(insertGrant, /\.update\(/);
  assert.match(source, /credits_remaining: product\.credits/);
  assert.match(source, /credits_remaining: product\.creditsPerPeriod/);
});

test("duplicate subscription periods do not create another grant", async () => {
  let insertCount = 0;
  const stored = { key: subscriptionGrantKey({ subscriptionId: "sub_1", transactionId: "tx_1" }), credits_remaining: 56 };
  const duplicate = await insertPaymentGrantOnce({
    insert: async () => { insertCount += 1; return { data: null, error: { code: "23505" } }; },
    findExisting: async () => ({ data: stored, error: null }),
  });
  assert.equal(insertCount, 1);
  assert.deepEqual(duplicate, { created: false, grant: stored });
});

test("fulfillment derives credits and subscription rights from the catalog", async () => {
  const source = await read("lib/payments/fulfillment.ts");
  assert.match(source, /getEnabledPaymentProduct\(input\.productKey\)/);
  assert.doesNotMatch(source, /credits:\s*number/);
  assert.doesNotMatch(source, /commercialLicense:\s*boolean/);
  assert.doesNotMatch(source, /priorityQueue:\s*boolean/);
  assert.doesNotMatch(source, /from "stripe"|from 'stripe'/);
});

test("migration preserves historical Stripe rows and adds provider uniqueness", async () => {
  const migration = await read("supabase/migrations/006_creem_payments.sql");
  assert.match(migration, /alter column stripe_checkout_session_id drop not null/);
  assert.match(migration, /alter column stripe_customer_id drop not null/);
  assert.match(migration, /alter column stripe_subscription_id drop not null/);
  assert.equal((migration.match(/payment_provider text not null default 'stripe'/g) ?? []).length, 2);
  assert.match(migration, /orders \(payment_provider, provider_checkout_id\)/);
  assert.match(migration, /orders \(payment_provider, provider_order_id\)/);
  assert.match(migration, /subscriptions \(payment_provider, provider_subscription_id\)/);
  assert.match(migration, /credit_grants \(payment_provider, provider_grant_key\)/);
  assert.doesNotMatch(migration, /update public\.(orders|subscriptions|credit_grants)/i);
});

test("payment event inbox uses an atomic RPC and is inaccessible to browser roles", async () => {
  const [migration, events] = await Promise.all([
    read("supabase/migrations/006_creem_payments.sql"),
    read("lib/payments/events.ts"),
  ]);
  assert.match(migration, /unique \(provider, event_id\)/);
  assert.match(migration, /status in \('processing', 'processed', 'failed'\)/);
  assert.match(migration, /alter table public\.payment_events enable row level security/);
  assert.doesNotMatch(migration, /create policy[\s\S]*payment_events/i);
  assert.match(migration, /on conflict \(provider, event_id\) do nothing/);
  assert.match(migration, /for update/);
  assert.match(migration, /claim_token uuid not null default gen_random_uuid\(\)/);
  assert.match(migration, /claim_token = gen_random_uuid\(\)/);
  assert.match(migration, /revoke all on function public\.begin_payment_event[\s\S]*from public/);
  assert.match(migration, /grant execute on function public\.begin_payment_event[\s\S]*to service_role/);
  assert.match(events, /admin\.rpc\("begin_payment_event"/);
  assert.match(events, /\.eq\("claim_token", input\.claimToken\)/);
  assert.doesNotMatch(events.slice(events.indexOf("beginPaymentEvent"), events.indexOf("markPaymentEventProcessed")), /\.from\("payment_events"\)\.select/);
});

test("environment remains fail-closed and exposes no Creem secret publicly", async () => {
  const env = await read(".env.example");
  for (const line of ["NEXT_PUBLIC_PAYMENTS_LIVE=false", "PAYMENTS_LIVE=false", "PAYMENTS_TEST_MODE=false", "PAYMENT_PROVIDER=creem", "CREEM_ENV=test", "CREEM_API_KEY=", "CREEM_WEBHOOK_SECRET=", "CREEM_PRODUCT_STARTER=", "CREEM_PRODUCT_PRO=", "CREEM_PRODUCT_CREDIT_PACK=", "CREEM_PRODUCT_TEST_CREDITS="]) assert.match(env, new RegExp(`^${line}$`, "m"));
  assert.doesNotMatch(env, /NEXT_PUBLIC_CREEM_(API_KEY|WEBHOOK_SECRET)/);
});
