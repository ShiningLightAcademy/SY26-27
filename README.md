# Shining Light Academy — Website

The official community website for **Shining Light Academy of Cagayan Valley, Inc.**, a
private Christian school in Sanchez-Mira, Cagayan, Philippines (Nursery → Senior High).

> *"We make your child's world better."*

It began life as a plain static site and has since grown into a **login-gated, database-backed
school portal** with a full admin dashboard. It is still built with **vanilla HTML, CSS, and
JavaScript** — no framework and no build step — but it now uses **Supabase** for authentication,
data storage, and file uploads, and is hosted for free on **GitHub Pages**.

- **Live site:** `https://shininglightacademy.github.io/SY26-27/`
- **Access:** restricted to `@slasm.net` Google accounts (school community only)

---

## Table of contents

1. [What the site does](#what-the-site-does)
2. [Tech stack](#tech-stack)
3. [How it's structured](#how-its-structured)
4. [Authentication & access control](#authentication--access-control)
5. [The pages](#the-pages)
6. [The admin dashboard](#the-admin-dashboard)
7. [Inline "Edit text" mode](#inline-edit-text-mode)
8. [Database (Supabase)](#database-supabase)
9. [Setup & deployment](#setup--deployment)
10. [Content, privacy & permissions](#content-privacy--permissions)
11. [Credits](#credits)

---

## What the site does

- Presents the school: vision, mission, awards, achievements, and learning modalities.
- Acts as a **student/parent portal** — every page is behind a Google sign-in gate, so only the
  school community can view it.
- Gives students one place to find their **Google Classroom links**, **class schedules**, and
  **subject color codes** for the school year.
- Introduces the **faculty** with photos and contact details.
- Shows a **photo gallery** of school events and moments.
- Provides a **contact form** that saves messages to a database the admins can read.
- Lets the school's admins manage all of the above (and post announcements, toggle maintenance
  mode, see who's online) from an in-browser **admin dashboard** — no code editing required.

---

## Tech stack

| Layer | What's used |
|---|---|
| Markup / styling | Hand-written HTML5 + an `assets/css/styles.css` design system |
| Interactivity | Vanilla JavaScript (no framework, no bundler) |
| Backend / data | [Supabase](https://supabase.com) — Postgres + Auth + Storage + Realtime |
| Auth | Supabase Auth → Google OAuth (PKCE flow), locked to `@slasm.net` |
| Hosting | GitHub Pages (static) |
| Fonts | Google Fonts — **Fraunces** (display serif) + **Outfit** (body) |

The Supabase JS SDK is loaded from a CDN (`@supabase/supabase-js@2`). There is **no `npm install`,
no compile step** — the files in this repo are the files that ship. Content is published by
uploading the changed files to this repository; GitHub Pages redeploys automatically.

---

## How it's structured

```
SY26-27/
├── index.html          ← Home (hero, vision/mission, awards, modalities, stats)
├── teachers.html       ← Faculty cards (from DB)
├── schedule.html       ← Per-grade schedule links (from DB)
├── classrooms.html     ← Per-grade Google Classroom links (from DB)
├── portfolio.html      ← Subject color codes per grade (from DB)
├── gallery.html        ← Photo gallery (from DB / Storage)
├── contact.html        ← Contact info + message form (saves to DB)
├── login.html          ← Google sign-in page
├── admin.html          ← Admin dashboard (admins only)
│
├── assets/
│   ├── css/
│   │   ├── styles.css  ← Whole-site design system + components + animations
│   │   └── admin.css   ← Admin dashboard styling
│   └── images/         ← Logo (sla-logo.svg / .png), building photo, etc.
├── src/
│   ├── core/           ← Infrastructure everything depends on
│   │   ├── supabase-client.js  ← Initializes Supabase, exposes the `window.sla` helper API
│   │   └── auth-guard.js       ← Per-page sign-in check + nav user menu + maintenance screen
│   ├── app/
│   │   └── main.js             ← Public-site interactions & animations
│   ├── features/
│   │   └── edit-mode.js        ← Inline on-page text editing for admins
│   └── pages/
│       └── admin.js            ← The entire admin dashboard logic
├── docs/               ← Architecture, database, and deployment guides
├── scripts/            ← Repo tooling (asset-reference checker)
└── .github/            ← CI workflow, issue/PR templates, CODEOWNERS
```

> The HTML pages stay at the repo root on purpose — their URLs are pinned in Supabase Auth and
> Google OAuth, so moving them breaks sign-in. Assets and source under `assets/` and `src/` can be
> reorganized freely. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
> [`docs/DATABASE.md`](docs/DATABASE.md), and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

The database schema and seed scripts live in Supabase (run once in the SQL Editor) and are kept
outside this repo for reference.

### The `window.sla` helper (`src/core/supabase-client.js`)

Every page loads `supabase-client.js` first. It creates one Supabase client and exposes a small
namespace, `window.sla`, that the rest of the site calls into:

- `getSession()` / `getUser()` / `getProfile()` — current auth + profile row
- `isAdmin()` — true if the profile's `role === 'admin'` and the account is active
- `signInWithGoogle()` — starts Google OAuth (forces the account chooser)
- `signOut()`
- `requireAuth()` / `requireAdmin()` — redirect guards used by protected/admin pages
- `touchPresence()` / `joinPresence()` / `onPresenceSync()` — "last seen" + live online presence
- `db` — the raw Supabase client for queries

---

## Authentication & access control

The site is **not public**. The flow:

1. Each protected page loads `supabase-client.js` then `auth-guard.js` **before** rendering content.
2. `auth-guard.js` checks for a session. No session → instant redirect to `login.html`.
3. `login.html` offers **"Sign in with Google."** Only `@slasm.net` accounts are accepted
   (enforced in Supabase and surfaced as a friendly error otherwise).
4. On success, the user lands back on the site with a **user pill** in the nav (avatar, first name,
   sign-out, and — for admins — an "Admin panel" link).

There are three roles, stored on each user's `profiles` row:

| Role | Can do |
|---|---|
| **Member** | View the whole site once signed in |
| **Admin** | Everything a member can, plus the admin dashboard (content, messages, announcements) |
| **Main admin** | Everything an admin can, plus manage other admins, toggle site maintenance mode, and see live presence / active-user stats |

> ⚠️ **Honest security note:** the HTML/CSS/JS are still served publicly by GitHub Pages, so a
> determined person could read the source. The auth gate keeps ordinary visitors out of the
> *content*, and Supabase **Row Level Security** properly protects the *data* (messages, profiles,
> etc.). For true page-content protection you'd need something like Cloudflare Access or a private
> repo.

---

## The pages

| Page | What's on it |
|---|---|
| **Home** (`index.html`) | Glassmorphic hero over the school building, awards/recognitions (linked to news & Facebook posts), Vision & Mission, an auto-rotating "Moments at SLA" card shuffle (DB-driven), learning-modality tiles, a scripture quote, and "by the numbers" stats. |
| **Teachers** (`teachers.html`) | Faculty cards rendered from the `teachers` table — photo, role, and contact methods (email, WhatsApp, TM/Smart, Globe, Zoom link + meeting ID/passcode). |
| **Schedule** (`schedule.html`) | One clickable link per grade level pointing to that grade's schedule (Google Drive), grouped by level (Preschool / Gradeschool / Junior High / Senior High). |
| **Classrooms** (`classrooms.html`) | One Google Classroom join link per grade level, grouped the same way. |
| **Portfolio** (`portfolio.html`) | Per-grade subject **color codes** (e.g. English = Red, Math = Teal) so students can organize folders/notebooks consistently. |
| **Gallery** (`gallery.html`) | Photo gallery / collage of school events and moments. |
| **Contact** (`contact.html`) | School contact channels + a message form that writes to `contact_messages`. |
| **Login** (`login.html`) | Google sign-in card over the building photo. |
| **Admin** (`admin.html`) | The dashboard (see below). |

The public site is heavily animated via `main.js`: a one-time logo "light burst" intro, scroll
reveals, hero parallax, a gold cursor follower (desktop), section-indicator dots, split-text title
reveals, carousels/accordions, a **carnival theme** (pennant bunting + a confetti burst on the
homepage), and an **announcement system** that shows an active announcement as a popup (then
collapses to a dismissible top banner).

---

## The admin dashboard

`admin.html` + `src/pages/admin.js` give admins a full content-management UI with these views:

- **Dashboard** — at-a-glance stats (unread messages, teacher count, active announcements). Main
  admins also see active-user counts, recent activity, a live **"Online now"** list (via Supabase
  Realtime presence), and a **site visibility / maintenance-mode** toggle.
- **Messages** — read contact-form submissions; opening one marks it read; one-click "Reply via email."
- **Admins** — (main admin) promote any `@slasm.net` user to admin or remove admin rights.
- **Announcements** — create/edit/delete; activating one auto-deactivates the rest; an optional
  call-to-action link. The active one shows site-wide as a popup/banner.
- **Schedule** — paste/edit the Google Drive schedule link for each grade.
- **Classrooms** — paste/edit the Google Classroom link for each grade.
- **Portfolio** — manage per-grade subjects and their color codes (add/edit/delete, color picker).
- **Teachers** — add/edit/delete teacher cards with **drag-to-reorder**, photo upload to Supabase
  Storage (or paste a URL), visibility toggle, and all contact fields.
- **Gallery** — manage gallery photos.
- **Home shuffle** — manage the homepage "Moments at SLA" rotating cards.
- **Site text** — edit headings, taglines, vision/mission, and section copy across the site from
  one form (stored as overrides in `site_content`; "Reset" restores the built-in default).

---

## Inline "Edit text" mode

`src/features/edit-mode.js` adds an even quicker way to edit copy. Any on-page element tagged with
`data-content-key="..."` is editable **in place**. When an admin is signed in, an **"Edit text"**
pill appears; clicking it makes those elements `contenteditable`, and "Save changes" upserts the
edits into the `site_content` table. Members and visitors never see any of this. (The same keys are
also editable from the admin dashboard's **Site text** view.)

---

## Database (Supabase)

All dynamic content lives in Postgres tables, protected by Row Level Security. The main tables:

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-in user: `email`, `full_name`, `role`, `is_main_admin`, `is_active`, `last_seen_at`. |
| `contact_messages` | Contact-form submissions: name, email, subject, message, `is_read`, `received_at`. |
| `teachers` | Faculty cards: name, role, photo, sort order, visibility, and contact fields (email/WhatsApp/TM/Globe/Zoom/meeting id/passcode). |
| `schedule_links` | Per-grade schedule URL, grouped by `level_group`. |
| `classroom_links` | Per-grade Google Classroom URL, grouped by `level_group`. |
| `portfolio_subjects` | Per-grade subject name + color (`color_hex`, `color_label`). |
| `announcements` | Title, body, optional link, `is_active`. |
| `home_shuffle_images` | Homepage rotating cards: image URL, caption, alt text, visibility, order. |
| `site_content` | Key/value overrides for editable site text. |
| `site_settings` | Global flags such as `public_visible` (maintenance mode). |
| `gallery` | Gallery photos. |

Uploaded images go to a Supabase **Storage** bucket named `sla-media`.

---

## Setup & deployment

This is a static site, so deployment is just hosting the files — but the backend needs wiring once.

1. **Create a Supabase project** and enable **Google** as an auth provider, restricted to
   `@slasm.net`.
2. **Create the database tables** by running the schema/seed scripts in the Supabase SQL Editor.
3. **Add your keys** — put your Supabase **Project URL** and **anon public** key into
   `src/core/supabase-client.js`. (Never put the `service_role` key in browser code.)
4. **Deploy to GitHub Pages:** keep the files in this repo, then
   **Settings → Pages → Deploy from branch → `main` / root**. Changes go live ~1 minute after upload.
5. **Configure redirect URLs** in Supabase (Auth → URL Configuration) to match the Pages URL.
6. **Promote yourself to admin** once you've signed in once.

To edit content afterward, you usually **don't touch the code** — sign in and use the admin
dashboard or inline edit mode.

---

## Content, privacy & permissions

- The site is **for the SLA community**, gated to `@slasm.net` accounts.
- **Student photos** in the Philippines require parental consent under the Data Privacy Act
  (RA 10173). Only add gallery/teacher photos you're authorized to publish.
- Vision/Mission and award text are based on the school's existing public materials — confirm with
  the school before changing or republishing.

---

## Credits

Built by **Ralph Jaden Muan Ongtangco (RJMO28)** for Shining Light Academy of Cagayan Valley, Inc.
Vanilla HTML/CSS/JS + Supabase, hosted on GitHub Pages.
