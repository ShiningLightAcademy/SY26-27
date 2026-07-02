-- Migration: collapse Senior High into a single "Grade 12"
-- Date: 2026-07-02
--
-- The public Schedule and Classrooms pages now show one "Grade 12" button
-- (STEM/HUMSS were removed). The admin panel lists whatever grade rows exist in
-- the schedule_links / classroom_links tables, so those tables must match.
--
-- This renames the existing "Grade 12 STEM" row to "Grade 12" (keeping its saved
-- link) and deletes the discontinued "Grade 12 HUMSS" row.
--
-- Run this ONCE in the Supabase SQL Editor.

-- Schedule links
update public.schedule_links   set grade_level = 'Grade 12' where grade_level = 'Grade 12 STEM';
delete from public.schedule_links                            where grade_level = 'Grade 12 HUMSS';

-- Classroom links
update public.classroom_links  set grade_level = 'Grade 12' where grade_level = 'Grade 12 STEM';
delete from public.classroom_links                           where grade_level = 'Grade 12 HUMSS';
