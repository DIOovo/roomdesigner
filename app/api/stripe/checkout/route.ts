import { NextResponse } from "next/server";
import { getStripe, stripePlans } from "@/lib/stripe/client";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe test mode is not configured. Add STRIPE_SECRET_KEY and Price IDs to .env.local." }, { status: 503 });
  const { plan } = (await request.json()) as { plan?: keyof typeof stripePlans };
  if (!plan || !stripePlans[plan]) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  const config = stripePlans[plan];
  const price = process.env[config.env];
  if (!price) return NextResponse.json({ error: `${config.env} is not configured.` }, { status: 503 });
  const supabase = await getSupabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "Sign in before starting checkout." }, { status: 401 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: config.mode,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/#pricing`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    ...(config.mode === "subscription" ? { subscription_data: { metadata: { user_id: user.id, plan } } } : {}),
    allow_promotion_codes: true,
  });
  return NextResponse.json({ url: session.url });
}
