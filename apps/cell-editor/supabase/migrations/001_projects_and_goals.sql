create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled project',
  cell_design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text not null default 'Untitled project',
  add column if not exists cell_design jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.design_goal (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  work_condition jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'design_goal'
      and column_name = 'requirement'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'design_goal'
      and column_name = 'constraints'
  ) then
    alter table public.design_goal rename column requirement to constraints;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'design_goal'
      and column_name = 'constraint'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'design_goal'
      and column_name = 'constraints'
  ) then
    alter table public.design_goal rename column "constraint" to constraints;
  end if;
end;
$$;

alter table public.design_goal
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists label text not null default '',
  add column if not exists work_condition jsonb not null default '{}'::jsonb,
  add column if not exists constraints jsonb not null default '{}'::jsonb,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.prediction_job
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists projects_user_updated_idx
  on public.projects(user_id, updated_at desc);

create index if not exists design_goal_project_sort_idx
  on public.design_goal(project_id, sort_order, created_at);

create index if not exists prediction_job_project_created_idx
  on public.prediction_job(project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists design_goal_set_updated_at on public.design_goal;
create trigger design_goal_set_updated_at
before update on public.design_goal
for each row execute function public.set_updated_at();

create or replace function public.enforce_prediction_job_project_owner()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id
      and p.user_id = new.user_id
      and p.user_id = auth.uid()
  ) then
    raise exception 'prediction_job project_id must belong to the authenticated user';
  end if;

  return new;
end;
$$;

drop trigger if exists prediction_job_project_owner_insert on public.prediction_job;
create trigger prediction_job_project_owner_insert
before insert on public.prediction_job
for each row execute function public.enforce_prediction_job_project_owner();

drop trigger if exists prediction_job_project_owner_update on public.prediction_job;
create trigger prediction_job_project_owner_update
before update of project_id, user_id on public.prediction_job
for each row execute function public.enforce_prediction_job_project_owner();

alter table public.projects enable row level security;
alter table public.design_goal enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects for select
using (user_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects for insert
with check (user_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects for delete
using (user_id = auth.uid());

drop policy if exists "design_goal_select_own" on public.design_goal;
create policy "design_goal_select_own"
on public.design_goal for select
using (user_id = auth.uid());

drop policy if exists "design_goal_insert_own" on public.design_goal;
create policy "design_goal_insert_own"
on public.design_goal for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = auth.uid()
  )
);

drop policy if exists "design_goal_update_own" on public.design_goal;
create policy "design_goal_update_own"
on public.design_goal for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = auth.uid()
  )
);

drop policy if exists "design_goal_delete_own" on public.design_goal;
create policy "design_goal_delete_own"
on public.design_goal for delete
using (user_id = auth.uid());

drop policy if exists "prediction_job_project_insert_own" on public.prediction_job;
create policy "prediction_job_project_insert_own"
on public.prediction_job for insert
with check (
  user_id = auth.uid()
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
);

drop policy if exists "prediction_job_project_update_own" on public.prediction_job;
create policy "prediction_job_project_update_own"
on public.prediction_job for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
);
