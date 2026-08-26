-- Reports whether every object the migrations create is present.
-- Safe to run any time; reads only. Every row should say ok = true.

with checks as (
  -- 0001: ownership column
  select 1 as seq, 'user_settings.user_id exists' as check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'user_id'
    ) as ok

  -- 0001: unique index, required by the settings upsert's ON CONFLICT
  union all select 2, 'user_settings has unique index on user_id',
    exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = 'user_settings'
        and indexdef ilike '%unique%' and indexdef ilike '%(user_id)%'
    )

  -- 0001: row-level security
  union all select 3, 'RLS enabled on user_settings',
    coalesce((select relrowsecurity from pg_class where oid = 'public.user_settings'::regclass), false)

  union all select 4, 'RLS enabled on jobs',
    coalesce((select relrowsecurity from pg_class where oid = 'public.jobs'::regclass), false)

  union all select 5, 'policy exists on user_settings',
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_settings')

  union all select 6, 'policy exists on jobs',
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs')

  -- 0001: default owner on direct inserts
  union all select 7, 'jobs.user_id defaults to auth.uid()',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'jobs' and column_name = 'user_id'
        and column_default ilike '%auth.uid()%'
    )

  -- 0002: preference columns
  union all select 8, 'user_settings.reminders_enabled exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'reminders_enabled')

  union all select 9, 'user_settings.reminder_days exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'reminder_days')

  union all select 10, 'user_settings.default_status exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'default_status')

  union all select 11, 'user_settings.language exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'language')

  -- 0002: check constraints
  union all select 12, 'reminder_days constraint present',
    exists (select 1 from pg_constraint where conname = 'user_settings_reminder_days_check')

  union all select 13, 'default_status constraint present',
    exists (select 1 from pg_constraint where conname = 'user_settings_default_status_check')

  union all select 14, 'language constraint present',
    exists (select 1 from pg_constraint where conname = 'user_settings_language_check')

  -- Columns the app reads that predate these migrations
  union all select 15, 'jobs.reminder_sent exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'jobs' and column_name = 'reminder_sent')

  union all select 16, 'user_settings.gemini_api_key exists',
    exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_settings' and column_name = 'gemini_api_key')
)
select check_name, ok from checks order by seq;

-- Rows that RLS now hides from everyone. Both should be 0.
select
  (select count(*) from jobs where user_id is null) as orphan_jobs,
  (select count(*) from user_settings where user_id is null) as orphan_settings;
