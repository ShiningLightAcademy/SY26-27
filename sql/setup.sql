-- ===========================================================
-- SHINING LIGHT ACADEMY — Backend Database Setup
-- Run this entire file in the Supabase SQL Editor (Dashboard
-- → SQL Editor → New query → paste → Run).
-- ===========================================================

-- ============================================================
-- 1. CONTACT MESSAGES — the working contact form
-- ============================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

-- Anyone signed in with an @slasm.net email can submit a message.
create policy "slasm users can submit messages"
on public.contact_messages
for insert
to authenticated
with check (
  lower(auth.jwt() ->> 'email') like '%@slasm.net'
);

-- Only YOU (the owner) can read messages. Replace the email below
-- with your own school email before running.
create policy "owner can read messages"
on public.contact_messages
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  --                              ^^^^^^^^^^^^^^^^
  -- CHANGE THIS to your actual @slasm.net email
);


-- ============================================================
-- 2. TEACHERS — optional, for dynamic teacher cards
-- ============================================================

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  photo_url text,
  display_order int default 0,
  created_at timestamptz default now()
);

alter table public.teachers enable row level security;

-- Anyone signed in with @slasm.net can read.
create policy "slasm users can read teachers"
on public.teachers
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') like '%@slasm.net'
);

-- Only the owner can write.
create policy "owner can write teachers"
on public.teachers
for all
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email
)
with check (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email
);


-- ============================================================
-- 3. CLASSROOMS — optional, for dynamic classroom links
-- ============================================================

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  teacher_name text,
  grade_level text,
  classroom_url text,
  display_order int default 0,
  created_at timestamptz default now()
);

alter table public.classrooms enable row level security;

create policy "slasm users can read classrooms"
on public.classrooms
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') like '%@slasm.net'
);

create policy "owner can write classrooms"
on public.classrooms
for all
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email
)
with check (
  lower(auth.jwt() ->> 'email') = 'rongtangco0621@slasm.net'
  -- CHANGE THIS to your actual @slasm.net email
);


-- ============================================================
-- 4. INDEXES — keep queries fast as data grows
-- ============================================================

create index if not exists contact_messages_created_idx
  on public.contact_messages(created_at desc);

create index if not exists teachers_order_idx
  on public.teachers(display_order);

create index if not exists classrooms_order_idx
  on public.classrooms(display_order);


-- ============================================================
-- DONE. Verify by running:
--   select * from public.contact_messages;
--   select * from public.teachers;
--   select * from public.classrooms;
-- (All should return 0 rows, no errors.)
-- ============================================================
