import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canUsePaymentTest } from "@/lib/payments/availability";
import { getWaffoProductId } from "@/lib/payments/catalog";
import { createWaffoCheckout } from "@/lib/payments/providers/waffo";
import { resolveSiteUrl } from "@/lib/site";
import { getSupabaseServer } from "@/lib/supabase/server";

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
  if (body.productKey !== "test_credits") {
    return NextResponse.json({ error: "This product is not available through Waffo checkout." }, { status: 400 });
  }
  if (!canUsePaymentTest(user.email)) {
    return NextResponse.json({ error: "Payment testing is not available for this account." }, { status: 403 });
  }
  if (!user.email) return NextResponse.json({ error: "A verified account email is required for checkout." }, { status: 400 });

  try {
    const productId = getWaffoProductId("test_credits");
    const checkoutReference = `roomfacelift-${randomUUID()}`;
    const checkout = await createWaffoCheckout({
      userId: user.id,
      email: user.email,
      productId,
      productKey: "test_credits",
      checkoutReference,
      successUrl: `${resolveSiteUrl()}/account?checkout=success`,
    });
    console.info("Waffo checkout created", { checkoutId: checkout.sessionId, productKey: "test_credits", userId: user.id, checkoutReference });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    console.error("Waffo checkout creation failed", { productKey: "test_credits", userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
