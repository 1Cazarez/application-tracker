-- Scopes settings and jobs to their owner.
-- Run this in the Supabase SQL editor before deploying.

-- One settings row per user, so each person's Gemini key is their own.
alter table user_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Required for upsert(..., { onConflict: 'user_id' }) to target the right row.
create unique index if not exists user_settings_user_id_key
  on user_settings (user_id);

alter table user_settings enable row level security;

drop policy if exists "Users manage their own settings" on user_settings;
create policy "Users manage their own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Jobs saved from /upload now set user_id explicitly, but the default keeps
-- direct inserts (SQL editor, future code) from creating orphan rows.
alter table jobs
  alter column user_id set default auth.uid();

alter table jobs enable row level security;

drop policy if exists "Users manage their own jobs" on jobs;
create policy "Users manage their own jobs"
  on jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Any pre-existing rows have a null user_id and stay invisible to every user.
-- To adopt them, run once with your own id:
--   update jobs set user_id = '<your-auth-uid>' where user_id is null;
--   update user_settings set user_id = '<your-auth-uid>' where user_id is null;
