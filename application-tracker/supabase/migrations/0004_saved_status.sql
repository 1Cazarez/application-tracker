-- Adds a 'saved' status for listings not applied to yet, and a flag for the
-- "applications have closed" email sent once an applied job's deadline
-- passes. Run this in the Supabase SQL editor before deploying.

alter table jobs
  add column if not exists closed_notice_sent boolean not null default false;

-- Replaces any earlier check on jobs.status under the default name. If the
-- table has one under another name, drop that too or 'saved' rows will be
-- rejected.
alter table jobs
  drop constraint if exists jobs_status_check;
alter table jobs
  add constraint jobs_status_check
  check (status in ('saved', 'applied', 'interview', 'offer', 'rejected'));

alter table user_settings
  drop constraint if exists user_settings_default_status_check;
alter table user_settings
  add constraint user_settings_default_status_check
  check (default_status in ('saved', 'applied', 'interview', 'offer', 'rejected'));
