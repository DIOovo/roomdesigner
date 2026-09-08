import { NextResponse } from "next/server";
import { verifyWebhook, WebhookEventType, type WebhookEvent, type WebhookEventData } from "@waffo/pancake-ts";
import { getPaymentProduct, getPaymentProductKeyByWaffoId, type PaymentProductKey } from "@/lib/payments/catalog";
import { beginPaymentEvent, markPaymentEventFailed, markPaymentEventProcessed } from "@/lib/payments/events";
import {
  grantOneTimeCredits,
  grantSubscriptionPeriod,
  markPaymentOrderRefunded,
  recordPaymentOrder,
  revokeOneTimeCreditsForRefund,
  syncPaidSubscription,
} from "@/lib/payments/fulfillment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type WaffoEvent = WebhookEvent<WebhookEventData>;
type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type TrustedContext = {
  admin: Admin;
  checkoutReference: string;
  productKey: PaymentProductKey;
  providerCustomerId: string | null;
  userId: string;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-waffo-signature");
  if (!signature) return NextResponse.json({ error: "Missing Waffo signature." }, { status: 401 });

  let event: WaffoEvent;
  try { event = verifyWebhook<WebhookEventData>(rawBody, signature, { environment: "prod" }); }
  catch { return NextResponse.json({ error: "Invalid Waffo signature." }, { status: 401 }); }
  if (event.mode !== "prod") return NextResponse.json({ error: "Invalid Waffo webhook environment." }, { status: 400 });

  let claim: Awaited<ReturnType<typeof beginPaymentEvent>>;
  try { claim = await beginPaymentEvent({ provider: "waffo", eventId: event.id, eventType: event.eventType }); }
  catch { return NextResponse.json({ error: "Webhook event could not be claimed." }, { status: 500 }); }
  if (!claim.claimed || !claim.claimToken) {
    console.info("Waffo webhook duplicate", { eventId: event.id, eventType: event.eventType, duplicate: true, status: claim.status });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const fulfillment = await dispatchEvent(event);
    await markPaymentEventProcessed({ provider: "waffo", eventId: event.id, claimToken: claim.claimToken });
    return NextResponse.json({ received: true, fulfillment });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Processing failed";
    console.error("Waffo webhook processing failed", { eventId: event.id, eventType: event.eventType, reason });
    try { await markPaymentEventFailed({ provider: "waffo", eventId: event.id, claimToken: claim.claimToken, error: reason }); }
    catch { console.error("Waffo webhook failure state could not be recorded", { eventId: event.id }); }
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function dispatchEvent(event: WaffoEvent) {
  switch (event.eventType) {
    case WebhookEventType.OrderCompleted:
      return fulfillOneTimeOrder(event);
    case WebhookEventType.SubscriptionActivated:
      return fulfillSubscriptionPeriod(event, "activated");
    case WebhookEventType.SubscriptionRenewed:
      return fulfillSubscriptionPeriod(event, "renewed");
    case WebhookEventType.SubscriptionPaymentSucceeded:
      return auditSubscriptionPayment(event);
    case WebhookEventType.SubscriptionRecovered:
      return syncSubscriptionState(event, "active", "active");
    case WebhookEventType.SubscriptionCanceling:
      return syncSubscriptionState(event, "scheduled_cancel", "canceling");
    case WebhookEventType.SubscriptionUncanceled:
      return syncSubscriptionState(event, "active", "active");
    case WebhookEventType.SubscriptionCanceled:
      return syncSubscriptionState(event, "canceled", "canceled");
    case WebhookEventType.SubscriptionPastDue:
      return syncSubscriptionState(event, "past_due", "past_due");
    case WebhookEventType.RefundSucceeded:
      return handleRefund(event, true);
    case WebhookEventType.RefundFailed:
      return handleRefund(event, false);
    default:
      return "ignored";
  }
}

async function fulfillOneTimeOrder(event: WaffoEvent) {
  if (event.data.orderStatus !== "completed" || event.data.paymentStatus !== "succeeded") {
    throw new Error("The Waffo order is not successfully paid and completed.");
  }
  const context = await trustedContext(event);
  if (!context) return "ignored";
  const product = getPaymentProduct(context.productKey);
  if (product.type !== "one_time") throw new Error("The Waffo completed order is not a one-time product.");

  const orderRecord = await recordOrder(event, context, "completed");
  const grant = await grantOneTimeCredits({
    userId: context.userId,
    provider: "waffo",
    providerOrderId: event.data.orderId,
    providerEventId: event.id,
    productKey: context.productKey,
    purchaseTime: event.timestamp,
    orderId: orderRecord.id,
  }, context.admin);
  console.info("Waffo one-time purchase fulfilled", {
    eventId: event.id,
    eventType: event.eventType,
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
    userId: context.userId,
    fulfillmentResult: grant.created ? "granted" : "existing",
    duplicate: !grant.created,
  });
  return grant.created ? "granted" : "existing";
}

async function fulfillSubscriptionPeriod(event: WaffoEvent, kind: "activated" | "renewed") {
  const context = await trustedContext(event);
  if (!context) return "ignored";
  assertSubscriptionContext(context);
  assertOrderStatus(event, "active");
  const period = subscriptionPeriod(event);

  await recordOrder(event, context, "active");
  await syncSubscription(event, context, "active", period);
  const grant = await grantSubscriptionPeriod({
    userId: context.userId,
    provider: "waffo",
    providerSubscriptionId: event.data.orderId,
    periodStart: period.start,
    periodEnd: period.end,
    providerEventId: event.id,
    productKey: context.productKey,
  }, context.admin);
  console.info("Waffo subscription period fulfilled", {
    eventId: event.id,
    eventType: event.eventType,
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
    periodStart: period.start,
    periodEnd: period.end,
    periodKind: kind,
    fulfillmentResult: grant.created ? "granted" : "existing",
    duplicate: !grant.created,
  });
  return grant.created ? "granted" : "existing";
}

async function auditSubscriptionPayment(event: WaffoEvent) {
  if (event.data.paymentStatus !== "succeeded") throw new Error("The Waffo subscription payment is not successful.");
  const context = await trustedContext(event);
  if (!context) return "ignored";
  assertSubscriptionContext(context);
  await recordOrder(event, context, "payment_succeeded");
  console.info("Waffo subscription payment recorded without credit grant", {
    eventId: event.id,
    eventType: event.eventType,
    paymentId: event.data.paymentId ?? null,
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
    userId: context.userId,
  });
  return "recorded";
}

async function syncSubscriptionState(
  event: WaffoEvent,
  status: "active" | "scheduled_cancel" | "canceled" | "past_due",
  expectedOrderStatus: "active" | "canceling" | "canceled" | "past_due",
) {
  const context = await trustedContext(event);
  if (!context) return "ignored";
  assertSubscriptionContext(context);
  assertOrderStatus(event, expectedOrderStatus);
  const period = subscriptionPeriod(event);
  await recordOrder(event, context, expectedOrderStatus);
  await syncSubscription(event, context, status, period);
  console.info("Waffo subscription state synchronized without credit grant", {
    eventId: event.id,
    eventType: event.eventType,
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
    subscriptionStatus: status === "scheduled_cancel" ? "active_until_period_end" : status,
    userId: context.userId,
  });
  return "synchronized";
}

async function handleRefund(event: WaffoEvent, succeeded: boolean) {
  const expectedStatus = succeeded ? "succeeded" : "failed";
  if (event.data.refundStatus !== expectedStatus) throw new Error("The Waffo refund status does not match the event.");
  const context = await trustedContext(event);
  if (!context) return "ignored";
  if (!succeeded) {
    console.info("Waffo failed refund recorded without entitlement change", {
      eventId: event.id,
      providerOrderId: event.data.orderId,
      productKey: context.productKey,
      userId: context.userId,
    });
    return "recorded";
  }

  const order = await markPaymentOrderRefunded({
    userId: context.userId,
    provider: "waffo",
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
  }, context.admin);
  const product = getPaymentProduct(context.productKey);
  if (product.type === "one_time") {
    await revokeOneTimeCreditsForRefund({
      userId: context.userId,
      provider: "waffo",
      providerOrderId: event.data.orderId,
      productKey: context.productKey,
      orderId: order.id,
    }, context.admin);
    return "refunded";
  }

  console.warn("Waffo subscription refund left entitlement unchanged pending authoritative subscription state", {
    eventId: event.id,
    providerOrderId: event.data.orderId,
    productKey: context.productKey,
    userId: context.userId,
  });
  return "refunded_order_recorded";
}

async function trustedContext(event: WaffoEvent): Promise<TrustedContext | null> {
  const metadata = event.data.orderMetadata;
  if (!metadata) throw new Error("The Waffo order metadata is missing.");
  const actualProductId = (metadata.waffo_product_id ?? metadata.product_id)?.trim();
  if (!actualProductId) throw new Error("The signed Waffo product ID is missing.");
  const productKey = getPaymentProductKeyByWaffoId(actualProductId);
  if (!productKey) {
    console.warn("Waffo order product is not eligible for fulfillment", { eventId: event.id, providerOrderId: event.data.orderId });
    return null;
  }
  if (metadata.product_key !== productKey) throw new Error("Waffo order metadata does not match the paid product.");

  const userId = metadata.user_id?.trim();
  if (!userId || !UUID.test(userId)) throw new Error("The Waffo order user ID is invalid.");
  const checkoutReference = metadata.checkout_reference?.trim();
  if (!checkoutReference || checkoutReference !== event.data.orderMerchantExternalId) {
    throw new Error("The Waffo checkout reference is invalid.");
  }

  const product = getPaymentProduct(productKey);
  if (event.data.currency.toUpperCase() !== product.currency) throw new Error("The Waffo order currency does not match the product.");
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service-role access is required.");
  const userResult = await admin.auth.admin.getUserById(userId);
  const user = userResult.data.user;
  if (userResult.error || !user) throw new Error("The Waffo order user does not exist.");
  if (event.data.buyerEmail && event.data.buyerEmail.toLowerCase() !== user.email?.toLowerCase()) {
    console.warn("Waffo checkout customer email differs from account email", { eventId: event.id, providerOrderId: event.data.orderId, userId });
  }
  return {
    admin,
    checkoutReference,
    productKey,
    providerCustomerId: event.data.merchantProvidedBuyerIdentity?.trim() || null,
    userId,
  };
}

async function recordOrder(event: WaffoEvent, context: TrustedContext, status: string) {
  return recordPaymentOrder({
    userId: context.userId,
    provider: "waffo",
    providerCheckoutId: context.checkoutReference,
    providerOrderId: event.data.orderId,
    providerCustomerId: context.providerCustomerId,
    amountTotal: displayAmountToMinorUnits(event.data.amount, "USD"),
    currency: event.data.currency,
    status,
    productKey: context.productKey,
  }, context.admin);
}

async function syncSubscription(
  event: WaffoEvent,
  context: TrustedContext & { productKey: "starter" | "pro" },
  status: "active" | "scheduled_cancel" | "canceled" | "past_due",
  period: { start: string; end: string },
) {
  return syncPaidSubscription({
    userId: context.userId,
    provider: "waffo",
    providerCustomerId: context.providerCustomerId,
    providerSubscriptionId: event.data.orderId,
    productKey: context.productKey,
    status,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
  }, context.admin);
}

function assertSubscriptionContext(context: TrustedContext): asserts context is TrustedContext & { productKey: "starter" | "pro" } {
  if (getPaymentProduct(context.productKey).type !== "subscription") {
    throw new Error("The Waffo event is not for a subscription product.");
  }
}

function assertOrderStatus(event: WaffoEvent, expected: string) {
  if (event.data.orderStatus !== expected) throw new Error("The Waffo subscription status does not match the event.");
}

function subscriptionPeriod(event: WaffoEvent) {
  if (event.data.billingPeriod !== "monthly") throw new Error("The Waffo subscription billing period is invalid.");
  const start = validIsoDate(event.data.currentPeriodStart, "current period start");
  const end = validIsoDate(event.data.currentPeriodEnd, "current period end");
  if (new Date(end).getTime() <= new Date(start).getTime()) throw new Error("The Waffo subscription period is invalid.");
  return { start, end };
}

function validIsoDate(value: string | undefined, label: string) {
  if (!value) throw new Error(`The Waffo ${label} is missing.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`The Waffo ${label} is invalid.`);
  return date.toISOString();
}

function displayAmountToMinorUnits(value: string, currency: "USD") {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid ${currency} payment amount.`);
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error(`Invalid ${currency} payment amount.`);
  return amount;
}
