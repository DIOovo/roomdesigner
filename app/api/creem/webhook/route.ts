import { NextResponse } from "next/server";
import { getPaymentProductKeyByCreemId } from "@/lib/payments/catalog";
import { beginPaymentEvent, markPaymentEventFailed, markPaymentEventProcessed } from "@/lib/payments/events";
import { grantOneTimeCredits, recordPaymentOrder } from "@/lib/payments/fulfillment";
import { verifyCreemWebhookSignature } from "@/lib/payments/providers/creem-signature";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;
type CreemEvent = { id: string; eventType: string; created_at?: number; object: JsonRecord };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureResult = verifyCreemWebhookSignature(rawBody, request.headers.get("creem-signature"), process.env.CREEM_WEBHOOK_SECRET);
  if (signatureResult === "unconfigured") return NextResponse.json({ error: "Creem webhook is not configured." }, { status: 503 });
  if (signatureResult === "missing") return NextResponse.json({ error: "Missing Creem signature." }, { status: 401 });
  if (signatureResult === "malformed") return NextResponse.json({ error: "Malformed Creem signature." }, { status: 400 });
  if (signatureResult === "invalid") return NextResponse.json({ error: "Invalid Creem signature." }, { status: 401 });

  let event: CreemEvent;
  try { event = parseEvent(JSON.parse(rawBody)); }
  catch { return NextResponse.json({ error: "Invalid Creem event payload." }, { status: 400 }); }

  let claim: Awaited<ReturnType<typeof beginPaymentEvent>>;
  try { claim = await beginPaymentEvent({ provider: "creem", eventId: event.id, eventType: event.eventType }); }
  catch { return NextResponse.json({ error: "Webhook event could not be claimed." }, { status: 500 }); }
  if (!claim.claimed || !claim.claimToken) {
    console.info("Creem webhook duplicate", { eventId: event.id, eventType: event.eventType, duplicate: true, status: claim.status });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.eventType === "checkout.completed") await fulfillCheckout(event);
    await markPaymentEventProcessed({ provider: "creem", eventId: event.id, claimToken: claim.claimToken });
    return NextResponse.json({ received: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Processing failed";
    console.error("Creem webhook processing failed", { eventId: event.id, eventType: event.eventType, reason });
    try { await markPaymentEventFailed({ provider: "creem", eventId: event.id, claimToken: claim.claimToken, error: reason }); }
    catch { console.error("Creem webhook failure state could not be recorded", { eventId: event.id }); }
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function fulfillCheckout(event: CreemEvent) {
  const checkout = event.object;
  const order = record(checkout.order, "checkout order");
  const checkoutId = text(checkout.id, "checkout ID");
  const orderId = text(order.id, "order ID");
  const checkoutStatus = text(checkout.status, "checkout status");
  const orderStatus = text(order.status, "order status");
  if (checkoutStatus !== "completed" || orderStatus !== "paid") throw new Error("The checkout is not paid and completed.");

  const orderProductId = objectId(order.product);
  const checkoutProductId = objectId(checkout.product);
  if (!orderProductId) throw new Error("The paid order has no product ID.");
  if (checkoutProductId && checkoutProductId !== orderProductId) throw new Error("Checkout and order product IDs do not match.");
  const productKey = getPaymentProductKeyByCreemId(orderProductId);
  if (productKey !== "credits" && productKey !== "test_credits") throw new Error("The Creem product is not a supported one-time credit product.");

  const metadata = record(checkout.metadata, "checkout metadata");
  const userId = text(metadata.user_id, "metadata user ID");
  if (!UUID.test(userId)) throw new Error("The checkout user ID is invalid.");
  if (metadata.product_key !== productKey) throw new Error("Checkout metadata does not match the paid product.");

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service-role access is required.");
  const userResult = await admin.auth.admin.getUserById(userId);
  const user = userResult.data.user;
  if (userResult.error || !user) throw new Error("The checkout user does not exist.");
  const customerEmail = objectEmail(checkout.customer);
  if (customerEmail && customerEmail.toLowerCase() !== user.email?.toLowerCase()) {
    console.warn("Creem checkout customer email differs from account email", { eventId: event.id, providerOrderId: orderId, userId });
  }

  const amount = integer(order.amount_paid ?? order.amount, "order amount");
  const currency = text(order.currency, "order currency");
  const providerCustomerId = objectId(order.customer) || objectId(checkout.customer) || null;
  const orderRecord = await recordPaymentOrder({
    userId,
    provider: "creem",
    providerCheckoutId: checkoutId,
    providerOrderId: orderId,
    providerCustomerId,
    amountTotal: amount,
    currency,
    status: orderStatus,
    productKey,
  }, admin);
  const grant = await grantOneTimeCredits({
    userId,
    provider: "creem",
    providerOrderId: orderId,
    providerEventId: event.id,
    productKey,
    purchaseTime: purchaseTime(order.created_at, event.created_at),
    orderId: orderRecord.id,
  }, admin);
  console.info("Creem one-time purchase fulfilled", {
    eventId: event.id,
    eventType: event.eventType,
    providerOrderId: orderId,
    productKey,
    userId,
    fulfillmentResult: grant.created ? "granted" : "existing",
    duplicate: !grant.created,
  });
}

function parseEvent(value: unknown): CreemEvent {
  const event = record(value, "event");
  return { id: text(event.id, "event ID"), eventType: text(event.eventType, "event type"), created_at: typeof event.created_at === "number" ? event.created_at : undefined, object: record(event.object, "event object") };
}
function record(value: unknown, label: string): JsonRecord { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}.`); return value as JsonRecord; }
function text(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${label}.`); return value.trim(); }
function integer(value: unknown, label: string) { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${label}.`); return value; }
function objectId(value: unknown) { if (typeof value === "string") return value.trim(); if (value && typeof value === "object" && !Array.isArray(value) && typeof (value as JsonRecord).id === "string") return ((value as JsonRecord).id as string).trim(); return ""; }
function objectEmail(value: unknown) { if (value && typeof value === "object" && !Array.isArray(value) && typeof (value as JsonRecord).email === "string") return ((value as JsonRecord).email as string).trim(); return ""; }
function purchaseTime(value: unknown, fallback?: number) { if (typeof value === "string" && !Number.isNaN(new Date(value).getTime())) return value; if (typeof fallback === "number" && Number.isFinite(fallback)) return new Date(fallback).toISOString(); return new Date().toISOString(); }
