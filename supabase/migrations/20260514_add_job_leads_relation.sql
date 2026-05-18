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

drop trigger if exists set_job_leads_updated_at on public.job_leads;
create trigger set_job_leads_updated_at
before update on public.job_leads
for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'job_id'
  ) then
    insert into public.job_leads (
      job_id,
      lead_id,
      query_text,
      matched_queries,
      matched_keywords,
      quality_tier,
      confidence,
      country,
      city,
      industry_group,
      pool_type,
      raw_result,
      created_at
    )
    select
      leads.job_id,
      leads.id,
      coalesce(nullif(leads.query_text, ''), leads.title, leads.canonical_url),
      coalesce(leads.matched_queries, '[]'::jsonb),
      coalesce(leads.matched_keywords, '[]'::jsonb),
      coalesce(nullif(leads.quality_tier, ''), 'broad'),
      coalesce(nullif(leads.confidence, ''), 'low'),
      leads.country,
      leads.city,
      leads.industry_group,
      leads.pool_type,
      coalesce(leads.raw_result, '{}'::jsonb),
      coalesce(leads.created_at, timezone('utc', now()))
    from public.leads
    where leads.job_id is not null
    on conflict (job_id, lead_id) do update
    set
      query_text = excluded.query_text,
      matched_queries = excluded.matched_queries,
      matched_keywords = excluded.matched_keywords,
      quality_tier = excluded.quality_tier,
      confidence = excluded.confidence,
      country = excluded.country,
      city = excluded.city,
      industry_group = excluded.industry_group,
      pool_type = excluded.pool_type,
      raw_result = excluded.raw_result;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'query_text'
  ) then
    execute $$alter table public.leads alter column query_text set default ''$$;
  end if;
end;
$$;
