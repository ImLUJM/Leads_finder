create extension if not exists pgcrypto;

create table if not exists public.lead_search_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  search_term text not null,
  phone_code text not null,
  country text,
  city text,
  industry_group text,
  pool_type text not null default 'local_customer',
  query_mode text not null default 'page1_only',
  platforms jsonb not null default '[]'::jsonb,
  query_plan jsonb not null default '[]'::jsonb,
  input_payload jsonb not null default '{}'::jsonb,
  query_count integer not null default 0,
  total_queries integer not null default 0,
  completed_queries integer not null default 0,
  success_queries integer not null default 0,
  failed_queries integer not null default 0,
  saved_leads integer not null default 0,
  refined_leads integer not null default 0,
  current_query text,
  progress jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_search_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.lead_search_jobs(id) on delete cascade,
  type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lead_search_job_events_job_id_created_at_idx
  on public.lead_search_job_events(job_id, created_at desc);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  platform text not null,
  source_url text not null,
  canonical_url text not null,
  title text not null,
  summary text not null default '',
  phone text not null,
  emails jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists leads_platform_phone_idx
  on public.leads(platform, phone);

create table if not exists public.job_leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.lead_search_jobs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  query_text text not null,
  matched_queries jsonb not null default '[]'::jsonb,
  matched_keywords jsonb not null default '[]'::jsonb,
  quality_tier text not null default 'broad',
  confidence text not null default 'low',
  country text,
  city text,
  industry_group text,
  pool_type text,
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(job_id, lead_id)
);

create index if not exists job_leads_job_id_created_at_idx
  on public.job_leads(job_id, created_at desc);

create index if not exists job_leads_lead_id_idx
  on public.job_leads(lead_id);

create index if not exists job_leads_quality_tier_idx
  on public.job_leads(quality_tier);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_lead_search_jobs_updated_at on public.lead_search_jobs;
create trigger set_lead_search_jobs_updated_at
before update on public.lead_search_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_job_leads_updated_at on public.job_leads;
create trigger set_job_leads_updated_at
before update on public.job_leads
for each row execute function public.set_updated_at();
