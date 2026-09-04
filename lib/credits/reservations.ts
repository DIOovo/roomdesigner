import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CreditReservation, CreditSource, RoomorphicPlan } from "@/lib/entitlements/types";

type ReservationRow = {
  success: boolean;
  error_code: CreditReservation["errorCode"];
  usage_id: string | null;
  credit_source: CreditSource | null;
  plan: RoomorphicPlan | null;
  resolution: "480p" | "768p" | null;
  is_watermarked: boolean | null;
  commercial_license: boolean | null;
  priority_queue: boolean | null;
};

export async function reserveGenerationCredit(input: { jobId: string; userId?: string; anonymousId?: string }) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase is required for credit reservations.");
  const result = await admin.rpc("reserve_generation_credit", {
    p_job_id: input.jobId,
    p_user_id: input.userId ?? null,
    p_anonymous_id: input.anonymousId ?? null,
  });
  if (result.error) throw new Error("The generation credit could not be reserved.");
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as ReservationRow | null;
  if (!row) throw new Error("The credit reservation returned no result.");
  return {
    success: row.success,
    errorCode: row.error_code,
    usageId: row.usage_id,
    creditSource: row.credit_source,
    plan: row.plan ?? "free",
    resolution: row.resolution ?? "480p",
    isWatermarked: row.is_watermarked ?? true,
    commercialLicense: row.commercial_license ?? false,
    priorityQueue: row.priority_queue ?? false,
  } satisfies CreditReservation;
}

export async function commitGenerationCredit(jobId: string) {
  return runCreditRpc("commit_generation_credit", jobId);
}

export async function releaseGenerationCredit(jobId: string) {
  return runCreditRpc("release_generation_credit", jobId);
}

async function runCreditRpc(name: "commit_generation_credit" | "release_generation_credit", jobId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const result = await admin.rpc(name, { p_job_id: jobId });
  if (result.error) throw new Error("The generation credit could not be updated.");
  return result.data === true;
}
