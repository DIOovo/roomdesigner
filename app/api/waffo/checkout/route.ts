import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canUsePaymentTest, isPaymentsLive } from "@/lib/payments/availability";
import { getWaffoProductId, isPaymentProductKey } from "@/lib/payments/catalog";
import { createWaffoCheckout } from "@/lib/payments/providers/waffo";
import { resolveSiteUrl } from "@/lib/site";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "Sign in before starting checkout." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => key !== "productKey")) {
    return NextResponse.json({ error: "Only productKey is accepted." }, { status: 400 });
  }
  if (!isPaymentProductKey(body.productKey)) {
    return NextResponse.json({ error: "Unknown payment product." }, { status: 400 });
  }
  const productKey = body.productKey;
  if (productKey === "test_credits" && !canUsePaymentTest(user.email)) {
    return NextResponse.json({ error: "Payment testing is not available for this account." }, { status: 403 });
  }
  if (productKey !== "test_credits" && !isPaymentsLive(process.env.PAYMENTS_LIVE)) {
    return NextResponse.json({ error: "Payments are temporarily unavailable." }, { status: 503 });
  }
  if (!user.email) return NextResponse.json({ error: "A verified account email is required for checkout." }, { status: 400 });

  try {
    const productId = getWaffoProductId(productKey);
    const checkoutReference = `roomfacelift-${randomUUID()}`;
    const checkout = await createWaffoCheckout({
      userId: user.id,
      email: user.email,
      productId,
      productKey,
      checkoutReference,
      successUrl: `${resolveSiteUrl()}/account?checkout=success`,
    });
    console.info("Waffo checkout created", { checkoutId: checkout.sessionId, productKey, userId: user.id, checkoutReference });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    console.error("Waffo checkout creation failed", { productKey, userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
