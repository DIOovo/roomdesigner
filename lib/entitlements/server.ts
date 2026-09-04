import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateEntitlements } from "./rules";
import type { GrantBalance, SubscriptionState } from "./rules";

export async function getUserEntitlements(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return calculateEntitlements({ authenticated: true, grants: [], subscriptions: [] });
  const [grants, subscriptions] = await Promise.all([
    admin.from("credit_grants").select("source,credits_remaining,expires_at").eq("user_id", userId),
    admin.from("subscriptions").select("plan,status,current_period_end").eq("user_id", userId),
  ]);
  if (grants.error || subscriptions.error) throw new Error("Entitlements could not be loaded.");
  return calculateEntitlements({
    authenticated: true,
    grants: (grants.data ?? []) as GrantBalance[],
    subscriptions: (subscriptions.data ?? []) as SubscriptionState[],
  });
}

export function getAnonymousEntitlements(usedCount: number) {
  return calculateEntitlements({ authenticated: false, anonymousCreditsRemaining: usedCount >= 1 ? 0 : 1 });
}
