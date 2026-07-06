-- Migration: Archive + delete contact messages
-- Date: 2026-07-06
--
-- Adds an `is_archived` flag to `contact_messages` so admins can tuck away
-- handled inquiries without deleting them (the admin Messages view gets an
-- Active / Archived toggle), and makes sure active admins are allowed to
-- UPDATE (archive / mark-read) and DELETE messages.
--
-- Run this ONCE in the Supabase SQL Editor. Until it is run, the Archive
-- button and the Archived tab will error, and Delete may be blocked by RLS.

-- 1) The archive flag ---------------------------------------------------------
alter table public.contact_messages
  add column if not exists is_archived boolean not null default false;

-- The inbox reads "newest first, not archived"; index that path.
create index if not exists contact_messages_archived_idx
  on public.contact_messages (is_archived, received_at desc);

-- 2) Write policies — active admins only -------------------------------------
-- (SELECT / INSERT policies already exist; these just add UPDATE + DELETE.
--  Permissive policies OR together, so naming them separately is safe.)

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update" on public.contact_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_active, true)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_active, true)
    )
  );

drop policy if exists "contact_messages_admin_delete" on public.contact_messages;
create policy "contact_messages_admin_delete" on public.contact_messages
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_active, true)
    )
  );

grant update, delete on public.contact_messages to authenticated;
