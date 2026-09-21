-- Tracks the date an application was actually submitted, separate from the
-- listing's deadline. Run this in the Supabase SQL editor.

alter table jobs
  add column if not exists date_applied date;

-- Backfill existing rows from created_at so applications added before this
-- migration aren't left blank.
update jobs
  set date_applied = created_at::date
  where date_applied is null;
