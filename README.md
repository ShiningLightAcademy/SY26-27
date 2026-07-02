# Shining Light Academy — School Website (SY 2026–27)

The official website and login-gated portal for **Shining Light Academy**, a private
Christian school in Sanchez-Mira, Cagayan, Philippines. It's a fast, framework-free
static site backed by [Supabase](https://supabase.com) for all dynamic content.

- **Live site:** https://shininglightacademy.github.io/SY26-27/
- **Repository:** https://github.com/ShiningLightAcademy/SY26-27

---

## What it does

Visitors sign in with a school Google account (`@slasm.net`) and get access to:

| Page | What's on it |
|---|---|
| **Home** (`index.html`) | Welcome, announcements, and a shuffling photo showcase. |
| **Teachers** (`teachers.html`) | Faculty cards with contact details, in a **Cards or List** view. |
| **Schedule** (`schedule.html`) | Per-grade class-schedule links, grouped by level. |
| **Classrooms** (`classrooms.html`) | Per-grade Google Classroom links. |
| **Portfolio** (`portfolio.html`) | Per-grade subject color codes. |
| **Gallery** (`gallery.html`) | Event photo sets shown as carousels (landscape **or portrait**). |
| **Contact** (`contact.html`) | Contact form that saves messages for admins. |
| **Login** (`login.html`) | Google OAuth sign-in. |
| **Admin** (`admin.html`) | Dashboard for admins to manage every section above. |

Admins additionally get **inline text editing** on public pages and the full
**Admin dashboard** (teachers, schedules, classrooms, portfolio, gallery,
announcements, homepage images, contact messages, site text, user management, and a
site-wide maintenance toggle).

---

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — no framework, **no build step**.
- **Supabase** — Postgres (with Row Level Security), Auth (Google OAuth), Storage,
  and Realtime (live presence). The browser uses only the public *anon* key; RLS
  decides what each user can read or write.
- **GitHub Pages** — hosting; pushing to `main` publishes the files as-is.
- **GitHub Actions** — CI that verifies every local asset/page reference resolves.

---

## Project structure

```
.
├── *.html                 Pages, served from the repo root (index, login, teachers, …)
├── assets/
│   ├── css/               styles.css (site) · admin.css (dashboard)
│   └── images/            logo + building photo
├── src/
│   ├── core/              supabase-client.js (window.sla API) · auth-guard.js
│   ├── app/               main.js — nav, scroll reveals, carousels, announcements
│   ├── features/          edit-mode.js — admin inline text editing
│   └── pages/             admin.js — the entire admin dashboard
├── scripts/               check-asset-refs.mjs — CI safety net
├── docs/                  ARCHITECTURE · DATABASE · DEPLOYMENT · migrations/
└── .github/workflows/     ci.yml
```

`window.sla` (from `src/core/supabase-client.js`) is the single integration point for
auth and data. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the script load
order and request/auth flow.

---

## Running it locally

No build step — you just need a static file server (some browsers block ES modules and
OAuth redirects over `file://`).

```bash
npm start          # serves the current folder (npx serve)
# then open the printed http://localhost:… URL
```

Requires **Node 18+** (only for the dev server and checks; the site itself ships no JS
dependencies). Note that Google sign-in only works from the deployed URL, because the
redirect URLs are registered in the Supabase and Google Cloud dashboards — see below.

### Useful scripts

```bash
npm test           # check that every local href/src in the HTML resolves
npm run check:assets   # same as test
npm run format         # Prettier — format all files
npm run format:check   # Prettier — verify formatting
```

---

## Backend (Supabase)

All dynamic content lives in Postgres tables protected by RLS, and uploaded images go to
a Storage bucket named `sla-media`. The table list, access model, and conventions are
documented in [`docs/DATABASE.md`](docs/DATABASE.md).

**Schema changes** are applied by running SQL once in the Supabase **SQL Editor**.
Incremental changes are tracked as files in [`docs/migrations/`](docs/migrations/) — run
each one once, newest last.

---

## Deploying

The site is published from **`main`** via GitHub Pages (root folder). Pushing to `main`
redeploys in about a minute; `.nojekyll` keeps the `assets/` and `src/` folders intact.

> ⚠️ **Do not change the URLs of the top-level HTML pages.** Those exact URLs are
> registered in Supabase Auth and Google OAuth; moving a page breaks sign-in until both
> dashboards are updated. Assets under `assets/` and `src/` can be reorganized freely.

Full details, including the one sign-in rule, are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). In short: 2-space indent, UTF-8, LF line
endings (`.editorconfig`), vanilla JS in IIFEs, and keep the HTML pages at the repo root.

## License

[MIT](LICENSE) © Shining Light Academy
