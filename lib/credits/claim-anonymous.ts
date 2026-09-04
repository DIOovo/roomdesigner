import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function claimAnonymousUsage(input: { userId: string; anonymousId: string; cookieUsed: number }) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const result = await admin.rpc("claim_anonymous_usage", {
    p_user_id: input.userId,
    p_anonymous_id: input.anonymousId,
    p_cookie_used: Math.min(1, Math.max(0, input.cookieUsed)),
  });
  if (result.error) throw new Error("Anonymous usage could not be linked to this account.");
  return result.data === true;
}
