create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  free_credits_remaining integer not null default 2 check (free_credits_remaining >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  plan text not null check (plan in ('starter','pro')),
  status text not null,
  period_credits integer not null default 0,
  credits_used integer not null default 0,
  commercial_license boolean not null default false,
  priority_queue boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('free','subscription','credit_pack','manual')),
  credits_total integer not null check (credits_total > 0),
  credits_remaining integer not null check (credits_remaining >= 0),
  expires_at timestamptz,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_job_id uuid,
  grant_id uuid references public.credit_grants(id),
  credits integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  status text not null check (status in ('queued','processing','completed','failed')),
  room_type text not null,
  style text not null,
  plan text not null,
  seconds integer not null default 3,
  resolution text not null default '480p',
  first_frame_url text,
  last_frame_url text,
  video_url text,
  provider text,
  provider_task_id text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.credit_usage add constraint credit_usage_generation_job_id_fkey foreign key (generation_job_id) references public.generation_jobs(id) on delete set null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  amount_total integer not null,
  currency text not null,
  status text not null,
  product_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_grants enable row level security;
alter table public.credit_usage enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.orders enable row level security;

create policy "users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "users view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "users view own grants" on public.credit_grants for select using (auth.uid() = user_id);
create policy "users view own usage" on public.credit_usage for select using (auth.uid() = user_id);
create policy "users view own jobs" on public.generation_jobs for select using (auth.uid() = user_id);
create policy "users view own orders" on public.orders for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generation-inputs', 'generation-inputs', true, 10485760, array['image/jpeg','image/png'])
on conflict (id) do nothing;
