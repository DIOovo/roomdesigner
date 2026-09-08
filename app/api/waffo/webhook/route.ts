import { NextResponse } from "next/server";
import { verifyWebhook, WebhookEventType, type WebhookEvent, type WebhookEventData } from "@waffo/pancake-ts";
import { getPaymentProduct, getPaymentProductKeyByWaffoId } from "@/lib/payments/catalog";
import { beginPaymentEvent, markPaymentEventFailed, markPaymentEventProcessed } from "@/lib/payments/events";
import { grantOneTimeCredits, recordPaymentOrder } from "@/lib/payments/fulfillment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-waffo-signature");
  if (!signature) return NextResponse.json({ error: "Missing Waffo signature." }, { status: 401 });

  let event: WebhookEvent<WebhookEventData>;
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
    const fulfillment = event.eventType === WebhookEventType.OrderCompleted ? await fulfillOrder(event) : "ignored";
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

async function fulfillOrder(event: WebhookEvent<WebhookEventData>) {
  const data = event.data;
  if (data.orderStatus !== "completed" || data.paymentStatus !== "succeeded") {
    throw new Error("The Waffo order is not successfully paid and completed.");
  }

  const metadata = data.orderMetadata;
  if (!metadata) throw new Error("The Waffo order metadata is missing.");
  const actualProductId = metadata.product_id?.trim();
  const productKey = actualProductId ? getPaymentProductKeyByWaffoId(actualProductId) : null;
  if (productKey !== "test_credits") {
    console.warn("Waffo order product is not eligible for fulfillment", { eventId: event.id, providerOrderId: data.orderId });
    return "ignored";
  }
  if (metadata.product_key !== productKey) throw new Error("Waffo order metadata does not match the paid product.");

  const userId = metadata.user_id?.trim();
  if (!userId || !UUID.test(userId)) throw new Error("The Waffo order user ID is invalid.");
  const checkoutReference = metadata.checkout_reference?.trim();
  if (!checkoutReference || checkoutReference !== data.orderMerchantExternalId) throw new Error("The Waffo checkout reference is invalid.");

  const product = getPaymentProduct(productKey);
  if (data.currency.toUpperCase() !== product.currency) throw new Error("The Waffo order currency does not match the product.");
  const amountTotal = displayAmountToMinorUnits(data.amount, product.currency);

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service-role access is required.");
  const userResult = await admin.auth.admin.getUserById(userId);
  const user = userResult.data.user;
  if (userResult.error || !user) throw new Error("The Waffo order user does not exist.");
  if (data.buyerEmail && data.buyerEmail.toLowerCase() !== user.email?.toLowerCase()) {
    console.warn("Waffo checkout customer email differs from account email", { eventId: event.id, providerOrderId: data.orderId, userId });
  }

  const orderRecord = await recordPaymentOrder({
    userId,
    provider: "waffo",
    providerCheckoutId: checkoutReference,
    providerOrderId: data.orderId,
    amountTotal,
    currency: data.currency,
    status: data.orderStatus,
    productKey,
  }, admin);
  const grant = await grantOneTimeCredits({
    userId,
    provider: "waffo",
    providerOrderId: data.orderId,
    providerEventId: event.id,
    productKey,
    purchaseTime: event.timestamp,
    orderId: orderRecord.id,
  }, admin);
  console.info("Waffo one-time purchase fulfilled", {
    eventId: event.id,
    eventType: event.eventType,
    providerOrderId: data.orderId,
    productKey,
    userId,
    fulfillmentResult: grant.created ? "granted" : "existing",
    duplicate: !grant.created,
  });
  return grant.created ? "granted" : "existing";
}

function displayAmountToMinorUnits(value: string, currency: "USD") {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid ${currency} payment amount.`);
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error(`Invalid ${currency} payment amount.`);
  return amount;
}
