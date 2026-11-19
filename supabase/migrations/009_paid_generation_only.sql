-- Paid-only generation. Preserve historical grants and paid balances.
begin;
alter table public.profiles alter column free_credits_remaining set default 0;
alter table public.anonymous_credit_state alter column free_credits_remaining set default 0;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, free_credits_remaining) values (new.id, 0) on conflict do nothing;
  return new;
end;
$$;
create or replace function public.reserve_paid_generation_credit(
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
  if p_user_id is null or p_anonymous_id is not null then
    return query select false, 'invalid_owner', null::uuid, null::text, null::text, null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found or (p_user_id is not null and v_job.user_id is distinct from p_user_id)
    or (p_anonymous_id is not null and v_job.anonymous_id is distinct from p_anonymous_id) then
    return query select false, 'job_not_found', null::uuid, null::text, null::text, null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  if v_job.credit_source = 'free' then
    return query select false, 'no_credits', null::uuid, null::text, null::text, null::text, null::boolean, null::boolean, null::boolean;
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
      and g.source <> 'free'
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


revoke all on function public.reserve_paid_generation_credit(uuid, uuid, text) from public;
grant execute on function public.reserve_paid_generation_credit(uuid, uuid, text) to service_role;
-- Keep the old RPC fail-closed too: old deployed clients cannot spend free grants.
create or replace function public.reserve_generation_credit(p_job_id uuid, p_user_id uuid default null, p_anonymous_id text default null)
returns table(success boolean, error_code text, usage_id uuid, credit_source text, plan text, resolution text, is_watermarked boolean, commercial_license boolean, priority_queue boolean)
language sql security definer set search_path = public as $$
  select * from public.reserve_paid_generation_credit(p_job_id, p_user_id, p_anonymous_id);
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
  values (p_anonymous_id, 0)
  on conflict (anonymous_id) do nothing;

  select * into v_state from public.anonymous_credit_state where anonymous_id = p_anonymous_id for update;
  if v_state.claimed_by is not null then return v_state.claimed_by = p_user_id; end if;

  v_used := 1 - v_state.free_credits_remaining;

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
commit;
