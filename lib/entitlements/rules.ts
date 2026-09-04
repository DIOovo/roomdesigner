import type { CreditSource, RoomorphicPlan, UserEntitlements } from "./types";

export type GrantBalance = { source: CreditSource; credits_remaining: number; expires_at: string | null };
export type SubscriptionState = { plan: "starter" | "pro"; status: string; current_period_end: string | null };

export function isActiveSubscription(subscription: SubscriptionState, now = Date.now()) {
  return (subscription.status === "active" || subscription.status === "trialing")
    && (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > now);
}

export function calculateEntitlements(input: {
  authenticated: boolean;
  anonymousCreditsRemaining?: number;
  grants?: GrantBalance[];
  subscriptions?: SubscriptionState[];
  now?: number;
}): UserEntitlements {
  const now = input.now ?? Date.now();
  if (!input.authenticated) {
    const remaining = Math.max(0, Math.min(1, input.anonymousCreditsRemaining ?? 1));
    return baseEntitlements(false, remaining, 0, 0, "free", null);
  }

  const validGrants = (input.grants ?? []).filter((grant) =>
    grant.credits_remaining > 0 && (!grant.expires_at || new Date(grant.expires_at).getTime() > now));
  const free = sum(validGrants, "free");
  const subscription = sum(validGrants, "subscription");
  const creditPack = sum(validGrants, "credit_pack") + sum(validGrants, "manual");
  const active = (input.subscriptions ?? [])
    .filter((item) => isActiveSubscription(item, now))
    .sort((a, b) => (a.plan === "pro" ? -1 : b.plan === "pro" ? 1 : 0))[0];
  const plan: RoomorphicPlan = active?.plan ?? "free";
  return baseEntitlements(true, free, subscription, creditPack, plan, active?.status ?? null);
}

function sum(grants: GrantBalance[], source: CreditSource) {
  return grants.filter((grant) => grant.source === source).reduce((total, grant) => total + grant.credits_remaining, 0);
}

function baseEntitlements(
  authenticated: boolean,
  free: number,
  subscription: number,
  creditPack: number,
  plan: RoomorphicPlan,
  subscriptionStatus: string | null,
): UserEntitlements {
  const paid = subscription + creditPack;
  const hasPaidEntitlement = plan !== "free" || paid > 0;
  return {
    authenticated,
    freeCreditsRemaining: free,
    subscriptionCreditsRemaining: subscription,
    creditPackCreditsRemaining: creditPack,
    paidCreditsRemaining: paid,
    totalCreditsRemaining: free + paid,
    plan,
    subscriptionStatus,
    commercialLicense: plan === "pro",
    priorityQueue: plan === "pro",
    watermarkRequired: !hasPaidEntitlement,
    resolution: hasPaidEntitlement ? "768p" : "480p",
  };
}
