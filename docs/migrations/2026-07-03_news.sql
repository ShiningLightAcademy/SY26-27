-- Migration: News articles
-- Date: 2026-07-03
--
-- Adds the `news_articles` table that powers the public News page (news.html)
-- and the "News" section in the admin panel. Admins create/edit/delete
-- articles; signed-in users read published ones. Cover images upload to the
-- existing `sla-media` storage bucket (under a `news/` prefix), so no new
-- bucket or storage policy is needed.
--
-- Run this ONCE in the Supabase SQL Editor. Until it is run, the News admin
-- view and the public News page simply show "no articles yet".

create table if not exists public.news_articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  excerpt         text,
  body            text,
  cover_image_url text,
  author          text,
  published_at    timestamptz default now(),
  is_published    boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz default now(),
  created_by      uuid references public.profiles(id)
);

-- Newest-first is the common read pattern; index the sort key.
create index if not exists news_articles_published_idx
  on public.news_articles (is_published, published_at desc);

-- ---- Row Level Security ----
alter table public.news_articles enable row level security;

-- READ: any signed-in user can read PUBLISHED articles; admins can read all
-- (so they can preview drafts before publishing).
drop policy if exists "news_select" on public.news_articles;
create policy "news_select" on public.news_articles
  for select to authenticated
  using (
    is_published = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_active, true)
    )
  );

-- WRITE (insert/update/delete): active admins only.
drop policy if exists "news_write" on public.news_articles;
create policy "news_write" on public.news_articles
  for all to authenticated
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

grant select, insert, update, delete on public.news_articles to authenticated;
