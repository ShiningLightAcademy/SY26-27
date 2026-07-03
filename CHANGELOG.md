# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **News page** (`news.html`): a public article list and single-article view, plus a
  **News** section in the admin panel to create/edit/delete articles (cover image
  upload, summary, body, author, date, publish toggle). Each article has a
  "Copy link" button. Requires running `docs/migrations/2026-07-03_news.sql` once
  in the Supabase SQL Editor to create the `news_articles` table.
- **Awards & Recognition editor** (admin): a dedicated admin view to edit each of the
  five homepage award boxes — title, description, and the link it opens — in one place,
  with per-box Save and "Reset to original". Handy for pointing an award box at a News
  article. Stored in `site_content`; the hardcoded text/links remain as fallbacks.
  (Replaces the award fields that were previously scattered in the Site Text list.)
- A **News** link in the main navigation and footer across the site.

### Changed
- Restructured the repository into an enterprise-style layout: source code under
  `src/` (`core/`, `app/`, `features/`, `pages/`), static assets under `assets/`
  (`css/`, `images/`), documentation under `docs/`, and project tooling under
  `.github/`. Deployed page URLs are unchanged, so login and existing links keep working.
- All HTML/JS asset and script references updated to the new paths.

### Removed
- Deleted accidental duplicate files (`styles.css` at root, `images/index.html`,
  `images/css/`) that were not referenced anywhere.

### Added
- Project metadata and tooling: `package.json`, `.editorconfig`, `.gitignore`,
  `.nojekyll`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`.
- CI workflow that verifies every local asset/page reference resolves.
- Issue/PR templates and `CODEOWNERS`.
- Architecture, database, and deployment docs under `docs/`.

## [1.0.0] — 2026-06

### Added
- Cards / List view toggle on the Teachers page (remembered per browser).
- `README.md` documenting the website.
- Login-gated portal backed by Supabase (auth, Postgres, Storage, Realtime) with a
  full admin dashboard, inline edit mode, announcements, and dynamic content for
  teachers, schedule, classrooms, portfolio, gallery, and contact pages.
