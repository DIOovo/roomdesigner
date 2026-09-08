-- Persist the Waffo-signed billing period start used for subscription state and grant idempotency.

alter table public.subscriptions
  add column if not exists current_period_start timestamptz;
