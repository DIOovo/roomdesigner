alter table public.generation_jobs
  add column if not exists design_scope text;

update public.generation_jobs
set design_scope = 'keep-layout'
where design_scope is null;

alter table public.generation_jobs
  alter column design_scope set default 'keep-layout',
  alter column design_scope set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_jobs_design_scope_check'
      and conrelid = 'public.generation_jobs'::regclass
  ) then
    alter table public.generation_jobs
      add constraint generation_jobs_design_scope_check
      check (design_scope in ('keep-layout', 'reimagine-space'));
  end if;
end
$$;
