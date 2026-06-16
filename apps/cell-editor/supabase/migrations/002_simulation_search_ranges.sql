alter table public.projects
  add column if not exists simulation_search_ranges jsonb not null default '[]'::jsonb;
