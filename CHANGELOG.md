# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
