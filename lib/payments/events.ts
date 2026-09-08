import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PaymentProvider } from "./fulfillment";

export async function beginPaymentEvent(input: {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  retryAfterSeconds?: number;
}, admin = requireAdmin()) {
  const result = await admin.rpc("begin_payment_event", {
    p_provider: input.provider,
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_retry_after_seconds: input.retryAfterSeconds ?? 300,
  });
  if (result.error) throw new Error("The payment event could not be claimed.");
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as { claimed: boolean; duplicate: boolean; event_status: string; claim_token: string | null } | null;
  if (!row) throw new Error("The payment event claim returned no result.");
  return { claimed: row.claimed, duplicate: row.duplicate, status: row.event_status, claimToken: row.claim_token };
}

export async function markPaymentEventProcessed(input: { provider: PaymentProvider; eventId: string; claimToken: string }, admin = requireAdmin()) {
  const result = await admin.from("payment_events").update({
    status: "processed",
    error: null,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("provider", input.provider).eq("event_id", input.eventId).eq("claim_token", input.claimToken).eq("status", "processing");
  if (result.error) throw new Error("The payment event could not be marked processed.");
}

export async function markPaymentEventFailed(input: { provider: PaymentProvider; eventId: string; claimToken: string; error?: string }, admin = requireAdmin()) {
  const result = await admin.from("payment_events").update({
    status: "failed",
    error: (input.error || "Processing failed").slice(0, 500),
    processed_at: null,
    updated_at: new Date().toISOString(),
  }).eq("provider", input.provider).eq("event_id", input.eventId).eq("claim_token", input.claimToken).eq("status", "processing");
  if (result.error) throw new Error("The payment event could not be marked failed.");
}

function requireAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service-role access is required for payment event processing.");
  return admin;
}
