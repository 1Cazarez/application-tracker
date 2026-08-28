-- User-facing preferences on the settings page.
-- Run this in the Supabase SQL editor.

alter table user_settings
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_days integer not null default 7,
  add column if not exists default_status text not null default 'applied',
  add column if not exists language text not null default 'en';

-- The reminder query looks ahead a fixed maximum, then narrows per user, so
-- the lead time has to stay inside that window.
alter table user_settings
  drop constraint if exists user_settings_reminder_days_check;
alter table user_settings
  add constraint user_settings_reminder_days_check
  check (reminder_days between 1 and 30);

alter table user_settings
  drop constraint if exists user_settings_default_status_check;
alter table user_settings
  add constraint user_settings_default_status_check
  check (default_status in ('applied', 'interview', 'offer', 'rejected'));

alter table user_settings
  drop constraint if exists user_settings_language_check;
alter table user_settings
  add constraint user_settings_language_check
  check (language in ('en', 'es'));
