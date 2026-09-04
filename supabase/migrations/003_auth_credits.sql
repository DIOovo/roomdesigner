-- Phase 3: authenticated credits, entitlement snapshots, and atomic reservations.

alter table public.credit_usage alter column user_id drop not null;

alter table public.credit_usage
  add column if not exists anonymous_id text,
  add column if not exists status text not null default 'committed',
  add column if not exists credit_source text,
  add column if not exists reserved_at timestamptz,
  add column if not exists committed_at timestamptz,
  add column if not exists released_at timestamptz;

update public.credit_usage
set status = 'committed',
    credit_source = coalesce(credit_source, 'manual'),
    committed_at = coalesce(committed_at, created_at)
where status is null or committed_at is null;

alter table public.credit_usage drop constraint if exists credit_usage_status_check;
alter table public.credit_usage add constraint credit_usage_status_check
  check (status in ('reserved', 'committed', 'released'));

alter table public.credit_usage drop constraint if exists credit_usage_credit_source_check;
alter table public.credit_usage add constraint credit_usage_credit_source_check
  check (credit_source is null or credit_source in ('free', 'subscription', 'credit_pack', 'manual'));

alter table public.credit_usage drop constraint if exists credit_usage_owner_check;
alter table public.credit_usage add constraint credit_usage_owner_check
  check ((user_id is not null and anonymous_id is null) or (user_id is null and anonymous_id is not null));

create unique index if not exists credit_usage_one_per_generation
  on public.credit_usage (generation_job_id)
  where generation_job_id is not null;

alter table public.generation_jobs
  add column if not exists credit_usage_id uuid references public.credit_usage(id) on delete set null,
  add column if not exists credit_source text,
  add column if not exists is_watermarked boolean not null default true,
  add column if not exists commercial_license boolean not null default false,
  add column if not exists priority_queue boolean not null default false;

alter table public.generation_jobs drop constraint if exists generation_jobs_credit_source_check;
alter table public.generation_jobs add constraint generation_jobs_credit_source_check
  check (credit_source is null or credit_source in ('free', 'subscription', 'credit_pack', 'manual'));

create table if not exists public.anonymous_credit_state (
  anonymous_id text primary key,
  free_credits_remaining integer not null default 1 check (free_credits_remaining between 0 and 1),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anonymous_credit_state enable row level security;

create index if not exists credit_grants_spend_order
  on public.credit_grants (user_id, source, expires_at, created_at)
  where credits_remaining > 0;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, free_credits_remaining)
  values (new.id, 2)
  on conflict (id) do nothing;

  insert into public.credit_grants (user_id, source, credits_total, credits_remaining)
  select new.id, 'free', 2, 2
  where not exists (
    select 1 from public.credit_grants where user_id = new.id and source = 'free'
  );
  return new;
end;
$$;

insert into public.credit_grants (user_id, source, credits_total, credits_remaining)
select p.id, 'free', 2, least(2, p.free_credits_remaining)
from public.profiles p
where not exists (
    select 1 from public.credit_grants g where g.user_id = p.id and g.source = 'free'
  );

create or replace function public.reserve_generation_credit(
  p_job_id uuid,
  p_user_id uuid default null,
  p_anonymous_id text default null
) returns table (
  success boolean,
  error_code text,
  usage_id uuid,
  credit_source text,
  plan text,
  resolution text,
  is_watermarked boolean,
  commercial_license boolean,
  priority_queue boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_grant public.credit_grants%rowtype;
  v_usage_id uuid;
  v_source text;
  v_plan text := 'free';
  v_resolution text := '480p';
  v_watermarked boolean := true;
  v_commercial boolean := false;
  v_priority boolean := false;
  v_anonymous public.anonymous_credit_state%rowtype;
begin
  if (p_user_id is null) = (p_anonymous_id is null) then
    return query select false, 'invalid_owner', null::uuid, null::text, null::text, null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found or (p_user_id is not null and v_job.user_id is distinct from p_user_id)
    or (p_anonymous_id is not null and v_job.anonymous_id is distinct from p_anonymous_id) then
    return query select false, 'job_not_found', null::uuid, null::text, null::text, null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  if v_job.credit_usage_id is not null then
    return query select true, null::text, v_job.credit_usage_id, v_job.credit_source, v_job.plan,
      v_job.resolution, v_job.is_watermarked, v_job.commercial_license, v_job.priority_queue;
    return;
  end if;

  if p_user_id is not null then
    select s.plan into v_plan
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    order by case s.plan when 'pro' then 0 else 1 end, s.current_period_end desc nulls first
    limit 1;
    v_plan := coalesce(v_plan, 'free');

    select * into v_grant
    from public.credit_grants g
    where g.user_id = p_user_id
      and g.credits_remaining > 0
      and (g.expires_at is null or g.expires_at > now())
    order by case g.source when 'free' then 0 when 'subscription' then 1 when 'credit_pack' then 2 else 3 end,
      g.expires_at asc nulls last,
      g.created_at asc
    for update skip locked
    limit 1;

    if not found then
      return query select false, 'no_credits', null::uuid, null::text, v_plan, null::text, null::boolean, null::boolean, null::boolean;
      return;
    end if;

    v_source := v_grant.source;
    update public.credit_grants set credits_remaining = credits_remaining - 1 where id = v_grant.id;

    if v_source <> 'free' or v_plan in ('starter', 'pro') then
      v_resolution := '768p';
      v_watermarked := false;
    end if;
    v_commercial := v_plan = 'pro';
    v_priority := v_plan = 'pro';

    insert into public.credit_usage (
      user_id, generation_job_id, grant_id, credits, status, credit_source, reserved_at
    ) values (
      p_user_id, p_job_id, v_grant.id, 1, 'reserved', v_source, now()
    ) returning id into v_usage_id;

    if v_source = 'free' then
      update public.profiles
      set free_credits_remaining = (
        select coalesce(sum(g.credits_remaining), 0)::integer
        from public.credit_grants g
        where g.user_id = p_user_id and g.source = 'free' and (g.expires_at is null or g.expires_at > now())
      )
      where id = p_user_id;
    end if;
  else
    insert into public.anonymous_credit_state (anonymous_id)
    values (p_anonymous_id)
    on conflict (anonymous_id) do nothing;

    select * into v_anonymous
    from public.anonymous_credit_state
    where anonymous_id = p_anonymous_id
    for update;

    if v_anonymous.claimed_by is not null or v_anonymous.free_credits_remaining <= 0 then
      return query select false, 'requires_auth', null::uuid, null::text, 'free'::text, null::text, null::boolean, null::boolean, null::boolean;
      return;
    end if;

    update public.anonymous_credit_state
    set free_credits_remaining = free_credits_remaining - 1, updated_at = now()
    where anonymous_id = p_anonymous_id;

    v_source := 'free';
    insert into public.credit_usage (
      anonymous_id, generation_job_id, credits, status, credit_source, reserved_at
    ) values (
      p_anonymous_id, p_job_id, 1, 'reserved', v_source, now()
    ) returning id into v_usage_id;
  end if;

  update public.generation_jobs
  set credit_usage_id = v_usage_id,
      credit_source = v_source,
      plan = v_plan,
      resolution = v_resolution,
      is_watermarked = v_watermarked,
      commercial_license = v_commercial,
      priority_queue = v_priority,
      updated_at = now()
  where id = p_job_id;

  return query select true, null::text, v_usage_id, v_source, v_plan,
    v_resolution, v_watermarked, v_commercial, v_priority;
end;
$$;

create or replace function public.commit_generation_credit(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_usage public.credit_usage%rowtype;
begin
  select * into v_usage from public.credit_usage where generation_job_id = p_job_id for update;
  if not found then return false; end if;
  if v_usage.status = 'committed' then return true; end if;
  if v_usage.status <> 'reserved' then return false; end if;
  update public.credit_usage set status = 'committed', committed_at = now() where id = v_usage.id;
  return true;
end;
$$;

create or replace function public.release_generation_credit(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.credit_usage%rowtype;
  v_claimed_by uuid;
begin
  select * into v_usage from public.credit_usage where generation_job_id = p_job_id for update;
  if not found then return false; end if;
  if v_usage.status = 'released' then return true; end if;
  if v_usage.status <> 'reserved' then return false; end if;

  if v_usage.grant_id is not null then
    update public.credit_grants set credits_remaining = least(credits_total, credits_remaining + v_usage.credits) where id = v_usage.grant_id;
  elsif v_usage.anonymous_id is not null then
    select claimed_by into v_claimed_by from public.anonymous_credit_state where anonymous_id = v_usage.anonymous_id for update;
    if v_claimed_by is null then
      update public.anonymous_credit_state
      set free_credits_remaining = least(1, free_credits_remaining + v_usage.credits), updated_at = now()
      where anonymous_id = v_usage.anonymous_id;
    end if;
  end if;

  update public.credit_usage set status = 'released', released_at = now() where id = v_usage.id;
  if v_usage.user_id is not null and v_usage.credit_source = 'free' then
    update public.profiles
    set free_credits_remaining = (
      select coalesce(sum(g.credits_remaining), 0)::integer from public.credit_grants g
      where g.user_id = v_usage.user_id and g.source = 'free' and (g.expires_at is null or g.expires_at > now())
    ) where id = v_usage.user_id;
  end if;
  return true;
end;
$$;

create or replace function public.claim_anonymous_usage(
  p_user_id uuid,
  p_anonymous_id text,
  p_cookie_used integer default 0
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.anonymous_credit_state%rowtype;
  v_grant public.credit_grants%rowtype;
  v_used integer;
begin
  if p_cookie_used < 0 or p_cookie_used > 1 then p_cookie_used := 1; end if;
  insert into public.anonymous_credit_state (anonymous_id, free_credits_remaining)
  values (p_anonymous_id, 1 - p_cookie_used)
  on conflict (anonymous_id) do nothing;

  select * into v_state from public.anonymous_credit_state where anonymous_id = p_anonymous_id for update;
  if v_state.claimed_by is not null then return v_state.claimed_by = p_user_id; end if;

  v_used := 1 - v_state.free_credits_remaining;
  insert into public.credit_grants (user_id, source, credits_total, credits_remaining)
  select p_user_id, 'free', 2, 2
  where not exists (select 1 from public.credit_grants where user_id = p_user_id and source = 'free');

  select * into v_grant from public.credit_grants
  where user_id = p_user_id and source = 'free'
  order by created_at asc for update limit 1;

  update public.credit_grants
  set credits_remaining = greatest(0, credits_remaining - v_used)
  where id = v_grant.id;

  update public.credit_usage
  set user_id = p_user_id, anonymous_id = null, grant_id = v_grant.id
  where anonymous_id = p_anonymous_id;

  update public.generation_jobs
  set user_id = p_user_id, anonymous_id = null, updated_at = now()
  where anonymous_id = p_anonymous_id and user_id is null;

  update public.anonymous_credit_state
  set claimed_by = p_user_id, claimed_at = now(), updated_at = now()
  where anonymous_id = p_anonymous_id;

  update public.profiles
  set free_credits_remaining = (
    select coalesce(sum(g.credits_remaining), 0)::integer from public.credit_grants g
    where g.user_id = p_user_id and g.source = 'free' and (g.expires_at is null or g.expires_at > now())
  ) where id = p_user_id;
  return true;
end;
$$;

create or replace function public.settle_generation_credit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.commit_generation_credit(new.id);
  elsif new.status = 'failed' and old.status is distinct from 'failed' then
    perform public.release_generation_credit(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists settle_generation_credit_on_status on public.generation_jobs;
create trigger settle_generation_credit_on_status
after update of status on public.generation_jobs
for each row execute function public.settle_generation_credit();

revoke all on function public.reserve_generation_credit(uuid, uuid, text) from public;
revoke all on function public.commit_generation_credit(uuid) from public;
revoke all on function public.release_generation_credit(uuid) from public;
revoke all on function public.claim_anonymous_usage(uuid, text, integer) from public;
grant execute on function public.reserve_generation_credit(uuid, uuid, text) to service_role;
grant execute on function public.commit_generation_credit(uuid) to service_role;
grant execute on function public.release_generation_credit(uuid) to service_role;
grant execute on function public.claim_anonymous_usage(uuid, text, integer) to service_role;
