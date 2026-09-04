import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type Plan = "starter" | "pro";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const admin = getSupabaseAdmin();
  if (!stripe || !secret || !signature || !admin) return NextResponse.json({ error: "Stripe webhook is not fully configured." }, { status: 503 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 }); }

  const existing = await admin.from("stripe_events").select("processed_at").eq("id", event.id).maybeSingle();
  if (existing.data?.processed_at) return NextResponse.json({ received: true, duplicate: true });
  if (!existing.data) {
    const inserted = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
    if (inserted.error && inserted.error.code !== "23505") return NextResponse.json({ error: "Stripe event could not be recorded." }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckout(admin, event.data.object, event.id);
    }
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncSubscription(admin, event.data.object);
    }
    if (event.type === "invoice.paid") await grantSubscriptionPeriod(admin, stripe, event.data.object, event.id);
    await ensure(await admin.from("stripe_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", event.id));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", { eventId: event.id, eventType: event.type, reason: error instanceof Error ? error.name : "unknown" });
    await admin.from("stripe_events").update({ error: "Processing failed" }).eq("id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function handleCheckout(admin: Admin, session: Stripe.Checkout.Session, eventId: string) {
  const userId = session.metadata?.user_id;
  const product = session.metadata?.plan;
  if (!userId || !product) throw new Error("missing checkout metadata");
  await ensure(await admin.from("orders").upsert({
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_customer_id: idOf(session.customer),
    amount_total: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    status: session.payment_status,
    product_type: product,
  }, { onConflict: "stripe_checkout_session_id" }));
  await ensure(await admin.from("profiles").update({ stripe_customer_id: idOf(session.customer) || null }).eq("id", userId));

  if (product === "credits" && (session.payment_status === "paid" || session.payment_status === "no_payment_required")) {
    await ensure(await admin.from("credit_grants").upsert({
      user_id: userId,
      source: "credit_pack",
      credits_total: 30,
      credits_remaining: 30,
      expires_at: addYear(new Date()).toISOString(),
      stripe_event_id: eventId,
    }, { onConflict: "stripe_event_id" }));
  }
}

async function syncSubscription(admin: Admin, subscription: Stripe.Subscription) {
  const existing = await admin.from("subscriptions").select("user_id,plan").eq("stripe_subscription_id", subscription.id).maybeSingle();
  const userId = subscription.metadata.user_id ?? existing.data?.user_id;
  const plan = parsePlan(subscription.metadata.plan ?? existing.data?.plan);
  if (!userId || !plan) throw new Error("missing subscription metadata");
  const active = subscription.status === "active" || subscription.status === "trialing";
  await ensure(await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: idOf(subscription.customer),
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    period_credits: plan === "pro" ? 60 : 20,
    current_period_end: subscriptionPeriodEnd(subscription),
    commercial_license: active && plan === "pro",
    priority_queue: active && plan === "pro",
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" }));
}

async function grantSubscriptionPeriod(admin: Admin, stripe: Stripe, invoice: Stripe.Invoice, eventId: string) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  let record = await admin.from("subscriptions").select("user_id,plan,status,current_period_end").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (!record.data) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(admin, subscription);
    record = await admin.from("subscriptions").select("user_id,plan,status,current_period_end").eq("stripe_subscription_id", subscriptionId).single();
  }
  if (record.error || !record.data) throw new Error("subscription record unavailable");
  const plan = parsePlan(record.data.plan);
  if (!plan || !["active", "trialing"].includes(record.data.status)) return;
  await ensure(await admin.from("credit_grants").upsert({
    user_id: record.data.user_id,
    source: "subscription",
    credits_total: plan === "pro" ? 60 : 20,
    credits_remaining: plan === "pro" ? 60 : 20,
    expires_at: record.data.current_period_end,
    stripe_event_id: eventId,
  }, { onConflict: "stripe_event_id" }));
}

function parsePlan(value: unknown): Plan | null { return value === "starter" || value === "pro" ? value : null; }
function idOf(value: string | { id: string } | null) { return typeof value === "string" ? value : value?.id ?? ""; }
function addYear(date: Date) { const next = new Date(date); next.setUTCFullYear(next.getUTCFullYear() + 1); return next; }
function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const seconds = subscription.items.data.map((item) => item.current_period_end).filter(Boolean).sort((a, b) => b - a)[0];
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const details = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
  if (details?.subscription) return idOf(details.subscription);
  const legacy = invoice as unknown as { subscription?: string | { id: string } | null };
  return idOf(legacy.subscription ?? null) || null;
}
async function ensure(result: { error: { message: string } | null }) { if (result.error) throw new Error("database operation failed"); }
