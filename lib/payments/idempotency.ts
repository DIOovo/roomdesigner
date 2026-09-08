export function oneTimeGrantKey(providerOrderId: string) {
  if (!providerOrderId) throw new Error("A provider order ID is required.");
  return `order:${providerOrderId}`;
}

export function subscriptionGrantKey(input: { subscriptionId: string; transactionId?: string | null; periodStart?: string | null }) {
  if (!input.subscriptionId) throw new Error("A provider subscription ID is required.");
  if (input.transactionId) return `subscription:${input.subscriptionId}:transaction:${input.transactionId}`;
  if (input.periodStart) return `subscription:${input.subscriptionId}:period:${input.periodStart}`;
  throw new Error("A transaction ID or billing period start is required.");
}

type InsertResult<T> = { data: T | null; error: { code?: string } | null };

export async function insertPaymentGrantOnce<T>(actions: {
  insert: () => Promise<InsertResult<T>>;
  findExisting: () => Promise<InsertResult<T>>;
}) {
  const inserted = await actions.insert();
  if (!inserted.error && inserted.data) return { created: true, grant: inserted.data };
  if (inserted.error?.code !== "23505") throw new Error("The credit grant could not be recorded.");
  const existing = await actions.findExisting();
  if (existing.error || !existing.data) throw new Error("The existing credit grant could not be loaded.");
  return { created: false, grant: existing.data };
}
