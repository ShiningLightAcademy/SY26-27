-- ===========================================================
-- SHINING LIGHT ACADEMY — Schedule table (Part 2)
-- Run this AFTER setup.sql in the Supabase SQL Editor.
-- ===========================================================

-- ============================================================
-- SCHEDULE ENTRIES — each row is one cell of the timetable
-- ============================================================

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 1 and 5),
  -- 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
  time_label text not null,
  -- e.g. "8:30 — 9:30"
  subject text not null,
  classroom_url text,
  -- nullable: not all entries are clickable (e.g. recess, lunch)
  is_break boolean default false,
  -- true for recess/lunch/chapel — spans all 5 days as one row
  display_order int not null default 0,
  -- order within the same time slot / page order
  created_at timestamptz default now()
);

alter table public.schedule_entries enable row level security;

create policy "slasm users can read schedule"
on public.schedule_entries
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') like '%@slasm.net'
);

create policy "owner can write schedule"
on public.schedule_entries
for all
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email (same as setup.sql)
)
with check (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email (same as setup.sql)
);

create index if not exists schedule_day_order_idx
  on public.schedule_entries(day_of_week, display_order);


-- ============================================================
-- DONE. Verify by running:
--   select * from public.schedule_entries;
-- (Should return 0 rows, no errors.)
-- ============================================================
