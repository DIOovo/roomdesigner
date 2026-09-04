alter table public.generation_jobs alter column seconds set default 5;

alter table public.generation_jobs
  add column if not exists stage text not null default 'queued',
  add column if not exists request_key text,
  add column if not exists first_frame_path text,
  add column if not exists last_frame_path text,
  add column if not exists raw_video_url text,
  add column if not exists raw_video_path text,
  add column if not exists watermarked_video_url text,
  add column if not exists watermarked_video_path text,
  add column if not exists started_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists attempt_count integer not null default 0;

create unique index if not exists generation_jobs_request_key_unique
  on public.generation_jobs (request_key)
  where request_key is not null;

create unique index if not exists generation_jobs_one_active_anonymous
  on public.generation_jobs (anonymous_id)
  where anonymous_id is not null and status in ('queued', 'processing');

create or replace function public.claim_generation_stage(
  p_job_id uuid,
  p_expected_stage text,
  p_next_stage text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare claimed boolean;
begin
  update public.generation_jobs
  set stage = p_next_stage,
      status = 'processing',
      started_at = coalesce(started_at, now()),
      updated_at = now(),
      attempt_count = attempt_count + 1
  where id = p_job_id
    and stage = p_expected_stage
    and status in ('queued', 'processing');
  claimed := found;
  return claimed;
end;
$$;

revoke all on function public.claim_generation_stage(uuid, text, text) from public;
grant execute on function public.claim_generation_stage(uuid, text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generation-results',
  'generation-results',
  false,
  157286400,
  array['image/jpeg','image/png','video/mp4']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
