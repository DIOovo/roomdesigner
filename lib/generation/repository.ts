import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { GenerationJob, GenerationStage } from "./types";

export function requireGenerationStore() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase is required for the real generation pipeline.");
  return admin;
}

export async function getJob(id: string) {
  const admin = requireGenerationStore();
  const result = await admin.from("generation_jobs").select("*").eq("id", id).maybeSingle();
  if (result.error) throw new Error("The generation job could not be loaded.");
  return result.data as GenerationJob | null;
}

export async function getJobByRequestKey(requestKey: string) {
  const admin = requireGenerationStore();
  const result = await admin.from("generation_jobs").select("*").eq("request_key", requestKey).maybeSingle();
  if (result.error) throw new Error("The generation request could not be checked.");
  return result.data as GenerationJob | null;
}

export async function claimStage(id: string, expected: GenerationStage, next: GenerationStage) {
  const admin = requireGenerationStore();
  const result = await admin.rpc("claim_generation_stage", { p_job_id: id, p_expected_stage: expected, p_next_stage: next });
  if (result.error) throw new Error("The generation stage could not be claimed.");
  return result.data === true;
}

export async function updateJob(id: string, values: Partial<GenerationJob>) {
  const admin = requireGenerationStore();
  const result = await admin.from("generation_jobs").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (result.error) throw new Error("The generation job could not be updated.");
}

export async function failJob(id: string, stage: string) {
  const { safeGenerationError } = await import("./errors");
  await updateJob(id, { status: "failed", stage: "failed", error: safeGenerationError(stage), completed_at: new Date().toISOString() });
}
