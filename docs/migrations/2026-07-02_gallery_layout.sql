-- Migration: add carousel layout option to gallery sets
-- Date: 2026-07-02
--
-- Adds a `layout` column to `gallery_sets` so each set can be shown as either a
-- landscape (wide) or portrait (tall) carousel on the public Gallery page.
--
-- Run this ONCE in the Supabase SQL Editor. Until it is run, the admin panel
-- still works: choosing "Portrait" simply won't persist (it falls back to
-- landscape) because src/pages/admin.js retries the save without this column.

alter table public.gallery_sets
  add column if not exists layout text not null default 'landscape';

-- Keep values sane; only the two supported layouts are allowed.
alter table public.gallery_sets
  drop constraint if exists gallery_sets_layout_check;
alter table public.gallery_sets
  add constraint gallery_sets_layout_check
  check (layout in ('landscape', 'portrait'));
