import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { typescript: true });
}

export const stripePlans = {
  starter: { env: "STRIPE_PRICE_STARTER", mode: "subscription" as const },
  pro: { env: "STRIPE_PRICE_PRO", mode: "subscription" as const },
  credits: { env: "STRIPE_PRICE_CREDIT_PACK", mode: "payment" as const },
};
