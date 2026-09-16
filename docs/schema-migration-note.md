# Lead Relation Migration Note

## What changed

The project now uses a two-layer persistence model for leads:

- `leads`
  - Global deduplicated lead entity
  - Unique by `dedupe_key`
  - Stores canonical page and contact fields

- `job_leads`
  - Per-job relationship table
  - Unique by `(job_id, lead_id)`
  - Stores query-specific fields such as `matched_queries`, `matched_keywords`, `quality_tier`, `confidence`, and `raw_result`

This prevents one search job from overwriting another job's historical ownership of the same lead.

## Files involved

- Base schema for fresh environments:
  - [20260514_create_lead_search_tables.sql](<../supabase/migrations/20260514_create_lead_search_tables.sql>)

- Upgrade migration for existing Supabase projects:
  - [20260514_add_job_leads_relation.sql](<../supabase/migrations/20260514_add_job_leads_relation.sql>)

## Upgrade steps

1. Open Supabase SQL Editor.
2. Execute `supabase/migrations/20260514_add_job_leads_relation.sql`.
3. Restart the app server so the repository switches from legacy mode to relational mode.

## Compatibility behavior

The backend repository now detects whether `job_leads` exists:

- If `job_leads` exists, it uses the new relational model.
- If `job_leads` does not exist, it temporarily falls back to the legacy single-table `leads` flow.

This means the app can still run before the migration is applied, but historical job-to-lead ownership is only fully correct after the migration.
