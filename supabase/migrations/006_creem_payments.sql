-- Provider-neutral payment records for Creem while preserving all Stripe columns.

alter table public.orders
  alter column stripe_checkout_session_id drop not null,
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists provider_checkout_id text,
  add column if not exists provider_order_id text,
  add column if not exists provider_customer_id text;

alter table public.orders
  add constraint orders_payment_provider_format_check
  check (payment_provider ~ '^[a-z][a-z0-9_-]{1,31}$');

create unique index orders_provider_checkout_unique
  on public.orders (payment_provider, provider_checkout_id);

create unique index orders_provider_order_unique
  on public.orders (payment_provider, provider_order_id);

alter table public.subscriptions
  alter column stripe_customer_id drop not null,
  alter column stripe_subscription_id drop not null,
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text;

alter table public.subscriptions
  add constraint subscriptions_payment_provider_format_check
  check (payment_provider ~ '^[a-z][a-z0-9_-]{1,31}$');

create unique index subscriptions_provider_subscription_unique
  on public.subscriptions (payment_provider, provider_subscription_id);

alter table public.credit_grants
  add column if not exists payment_provider text,
  add column if not exists provider_event_id text,
  add column if not exists provider_grant_key text,
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.credit_grants
  add constraint credit_grants_payment_provider_format_check
  check (payment_provider is null or payment_provider ~ '^[a-z][a-z0-9_-]{1,31}$');

create unique index credit_grants_provider_grant_unique
  on public.credit_grants (payment_provider, provider_grant_key);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{1,31}$'),
  event_id text not null,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error text,
  claim_token uuid not null default gen_random_uuid(),
  attempt_count integer not null default 1 check (attempt_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

alter table public.payment_events enable row level security;

create or replace function public.begin_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_retry_after_seconds integer default 300
) returns table (
  claimed boolean,
  duplicate boolean,
  event_status text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.payment_events%rowtype;
begin
  if p_provider is null or p_provider !~ '^[a-z][a-z0-9_-]{1,31}$'
    or nullif(btrim(p_event_id), '') is null
    or nullif(btrim(p_event_type), '') is null then
    raise exception 'invalid payment event identity';
  end if;

  insert into public.payment_events (provider, event_id, event_type)
  values (p_provider, p_event_id, p_event_type)
  on conflict (provider, event_id) do nothing
  returning * into v_event;

  if found then
    return query select true, false, v_event.status, v_event.claim_token;
    return;
  end if;

  select * into v_event
  from public.payment_events
  where provider = p_provider and event_id = p_event_id
  for update;

  if v_event.status = 'processed' then
    return query select false, true, v_event.status, null::uuid;
    return;
  end if;

  if v_event.status = 'processing'
    and v_event.updated_at > now() - make_interval(secs => greatest(coalesce(p_retry_after_seconds, 300), 0)) then
    return query select false, true, v_event.status, null::uuid;
    return;
  end if;

  update public.payment_events
  set status = 'processing',
      event_type = p_event_type,
      error = null,
      processed_at = null,
      claim_token = gen_random_uuid(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  where id = v_event.id
  returning * into v_event;

  return query select true, false, v_event.status, v_event.claim_token;
end;
$$;

revoke all on function public.begin_payment_event(text, text, text, integer) from public;
grant execute on function public.begin_payment_event(text, text, text, integer) to service_role;
