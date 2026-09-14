-- Optional private style-reference snapshot for After Image generation.

alter table public.generation_jobs
  add column if not exists reference_frame_path text;
