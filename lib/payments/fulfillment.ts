import "server-only";
import { getEnabledPaymentProduct, getPaymentProduct, type PaymentProductKey } from "./catalog";
import { insertPaymentGrantOnce, oneTimeGrantKey, subscriptionGrantKey } from "./idempotency";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
export type PaymentProvider = "stripe" | "creem" | "waffo";

type TrustedOrderInput = {
  userId: string;
  provider: PaymentProvider;
  providerCheckoutId: string;
  providerOrderId: string;
  providerCustomerId?: string | null;
  amountTotal: number;
  currency: string;
  status: string;
  productKey: PaymentProductKey;
};

export async function recordPaymentOrder(input: TrustedOrderInput, admin = requireAdmin()) {
  getPaymentProduct(input.productKey);
  const result = await admin.from("orders").upsert({
    user_id: input.userId,
    payment_provider: input.provider,
    provider_checkout_id: required(input.providerCheckoutId, "provider checkout ID"),
    provider_order_id: required(input.providerOrderId, "provider order ID"),
    provider_customer_id: input.providerCustomerId ?? null,
    amount_total: trustedNonNegativeInteger(input.amountTotal, "payment amount"),
    currency: trustedCurrency(input.currency),
    status: required(input.status, "payment status"),
    product_type: input.productKey,
  }, { onConflict: "payment_provider,provider_order_id" }).select("id,user_id,status,product_type").single();
  return dataOrThrow(result, "The payment order could not be recorded.");
}

export async function grantOneTimeCredits(input: {
  userId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  providerEventId: string;
  productKey: PaymentProductKey;
  purchaseTime: Date | string;
  orderId?: string | null;
}, admin = requireAdmin()) {
  const product = getPaymentProduct(input.productKey);
  if (product.type !== "one_time") throw new Error("The payment product is not a one-time credit product.");
  const purchaseTime = validDate(input.purchaseTime, "purchase time");
  const expiresAt = new Date(purchaseTime);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + product.expiresInDays);
  return insertCreditGrant(admin, {
    user_id: input.userId,
    source: "credit_pack",
    credits_total: product.credits,
    credits_remaining: product.credits,
    expires_at: expiresAt.toISOString(),
    payment_provider: input.provider,
    provider_event_id: required(input.providerEventId, "provider event ID"),
    provider_grant_key: oneTimeGrantKey(input.providerOrderId),
    order_id: input.orderId ?? null,
  });
}

export async function syncPaidSubscription(input: {
  userId: string;
  provider: PaymentProvider;
  providerCustomerId?: string | null;
  providerSubscriptionId: string;
  productKey: "starter" | "pro";
  status: "active" | "trialing" | "scheduled_cancel" | "canceled" | "past_due" | "unpaid" | "expired" | "paused";
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
}, admin = requireAdmin()) {
  const product = getEnabledPaymentProduct(input.productKey);
  if (product.type !== "subscription") throw new Error("The payment product is not a subscription.");
  const status = input.status === "scheduled_cancel" ? "active" : input.status;
  const active = status === "active" || status === "trialing";
  const result = await admin.from("subscriptions").upsert({
    user_id: input.userId,
    payment_provider: input.provider,
    provider_customer_id: input.providerCustomerId?.trim() || null,
    provider_subscription_id: required(input.providerSubscriptionId, "provider subscription ID"),
    plan: input.productKey,
    status,
    period_credits: product.creditsPerPeriod,
    commercial_license: active && product.commercialLicense,
    priority_queue: active && product.priorityQueue,
    current_period_start: input.currentPeriodStart ? validDate(input.currentPeriodStart, "current period start").toISOString() : null,
    current_period_end: input.currentPeriodEnd ? validDate(input.currentPeriodEnd, "current period end").toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "payment_provider,provider_subscription_id" }).select("id,user_id,plan,status,current_period_start,current_period_end").single();
  return dataOrThrow(result, "The paid subscription could not be synchronized.");
}

export async function markPaymentOrderRefunded(input: {
  userId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  productKey: PaymentProductKey;
}, admin = requireAdmin()) {
  getPaymentProduct(input.productKey);
  const result = await admin.from("orders")
    .update({ status: "refunded" })
    .eq("payment_provider", input.provider)
    .eq("provider_order_id", required(input.providerOrderId, "provider order ID"))
    .eq("user_id", input.userId)
    .eq("product_type", input.productKey)
    .select("id,user_id,status,product_type")
    .single();
  return dataOrThrow(result, "The refunded payment order could not be updated.");
}

export async function revokeOneTimeCreditsForRefund(input: {
  userId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  productKey: PaymentProductKey;
  orderId: string;
}, admin = requireAdmin()) {
  const product = getPaymentProduct(input.productKey);
  if (product.type !== "one_time") throw new Error("The refunded payment product is not a one-time credit product.");
  const result = await admin.from("credit_grants")
    .update({ credits_remaining: 0 })
    .eq("payment_provider", input.provider)
    .eq("provider_grant_key", oneTimeGrantKey(input.providerOrderId))
    .eq("order_id", input.orderId)
    .eq("user_id", input.userId)
    .select("id,credits_total,credits_remaining,provider_grant_key")
    .single();
  return dataOrThrow(result, "The refunded credit grant could not be revoked.");
}

export async function grantSubscriptionPeriod(input: {
  userId: string;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  providerTransactionId?: string | null;
  periodStart?: Date | string | null;
  periodEnd: Date | string;
  providerEventId: string;
  productKey: "starter" | "pro";
}, admin = requireAdmin()) {
  const product = getEnabledPaymentProduct(input.productKey);
  if (product.type !== "subscription") throw new Error("The payment product is not a subscription.");
  const periodStart = input.periodStart ? validDate(input.periodStart, "period start").toISOString() : null;
  return insertCreditGrant(admin, {
    user_id: input.userId,
    source: "subscription",
    credits_total: product.creditsPerPeriod,
    credits_remaining: product.creditsPerPeriod,
    expires_at: validDate(input.periodEnd, "period end").toISOString(),
    payment_provider: input.provider,
    provider_event_id: required(input.providerEventId, "provider event ID"),
    provider_grant_key: subscriptionGrantKey({
      subscriptionId: input.providerSubscriptionId,
      transactionId: input.providerTransactionId,
      periodStart,
    }),
  });
}

async function insertCreditGrant(admin: Admin, row: Record<string, unknown>) {
  return insertPaymentGrantOnce({
    insert: async () => await admin.from("credit_grants").insert(row).select("id,user_id,source,credits_total,credits_remaining,expires_at,provider_grant_key").single(),
    findExisting: async () => await admin.from("credit_grants")
      .select("id,user_id,source,credits_total,credits_remaining,expires_at,provider_grant_key")
      .eq("payment_provider", String(row.payment_provider))
      .eq("provider_grant_key", String(row.provider_grant_key))
      .single(),
  });
}

function requireAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service-role access is required for payment fulfillment.");
  return admin;
}

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`A valid ${label} is required.`);
  return normalized;
}

function trustedNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`A valid ${label} is required.`);
  return value;
}

function trustedCurrency(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(normalized)) throw new Error("A valid payment currency is required.");
  return normalized;
}

function validDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`A valid ${label} is required.`);
  return date;
}

function dataOrThrow<T>(result: { data: T; error: { message: string } | null }, message: string) {
  if (result.error || !result.data) throw new Error(message);
  return result.data;
}
