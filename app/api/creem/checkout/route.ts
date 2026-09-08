import { NextResponse } from "next/server";
import { canUsePaymentTest, isPaymentsLive } from "@/lib/payments/availability";
import { getCreemProductId } from "@/lib/payments/catalog";
import { createCheckoutRequestId, createCreemCheckout } from "@/lib/payments/providers/creem";
import { resolveSiteUrl } from "@/lib/site";
import { getSupabaseServer } from "@/lib/supabase/server";

type CheckoutProduct = "credits" | "test_credits";

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
  if (body.productKey !== "credits" && body.productKey !== "test_credits") {
    return NextResponse.json({ error: "This product is not available through Creem checkout." }, { status: 400 });
  }
  const productKey: CheckoutProduct = body.productKey;
  if (productKey === "credits" && !isPaymentsLive(process.env.PAYMENTS_LIVE)) {
    return NextResponse.json({ error: "Payments are temporarily unavailable." }, { status: 503 });
  }
  if (productKey === "test_credits" && !canUsePaymentTest(user.email)) {
    return NextResponse.json({ error: "Payment testing is not available for this account." }, { status: 403 });
  }
  if (!user.email) return NextResponse.json({ error: "A verified account email is required for checkout." }, { status: 400 });

  try {
    const productId = getCreemProductId(productKey);
    const requestId = createCheckoutRequestId(user.id, productKey);
    const checkout = await createCreemCheckout({
      userId: user.id,
      email: user.email,
      productKey,
      productId,
      requestId,
      successUrl: `${resolveSiteUrl()}/account?checkout=success`,
    });
    console.info("Creem checkout created", { checkoutId: checkout.id, productKey, userId: user.id, requestId: checkout.requestId });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    console.error("Creem checkout creation failed", { productKey, userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
