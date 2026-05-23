# Shining Light Academy — Website (Frontend v2)

A complete redesign of the SLA website with Apple-style scroll animations, minimalist hero, card-shuffle carousel, and dynamic interactions. Pure HTML/CSS/JS — no backend yet (we'll add Supabase + admin back in Stage 2 once the front-end looks right).

## What's in this bundle

**8 pages:**
- `index.html` — Minimalist hero, vision/mission, card-shuffle gallery preview, physical-vs-virtual learning, stats
- `teachers.html` — "Movers & Shakers" — 20 teacher placeholders with expandable contact details
- `schedule.html` — Grade-level buttons grouped by school division (Preschool → Senior High)
- `classrooms.html` — Same structure as schedule, for Google Classroom enrollment links
- `portfolio.html` — Subject color codes per grade level
- `gallery.html` — Mix of single images and image carousels, each with a title
- `contact.html` — Contact form (opens mailto to `sla@slasm.net`)
- `images/sla-logo.png` — School crest (used as favicon and in hero)

**Assets:**
- `css/styles.css` — Single stylesheet with all design tokens and components
- `js/main.js` — All interactions: nav, scroll reveal, card shuffle, gallery carousels, teacher accordions

## How to deploy

Same as before — drag the contents into your GitHub repo, overwriting everything. GitHub Pages will redeploy in ~1 minute.

## What to do first (content)

Most things on the site are placeholders. Here's what to replace, in priority order:

### High priority
- **Teacher cards** (`teachers.html`) — replace 20 placeholders with real names, subjects, contact details, photos. **Get each teacher's written consent before publishing their phone numbers or Zoom credentials.**
- **Schedule buttons** (`schedule.html`) — point each `href="#"` to the actual Google Drive link for that grade's schedule
- **Classroom buttons** (`classrooms.html`) — same idea, but linking to Google Classroom invite URLs
- **Portfolio links** (`portfolio.html`) — link each grade to its subject color code document

### Medium priority
- **Gallery photos** (`gallery.html`) — replace each `<div class="placeholder">x</div>` with `<img src="images/your-photo.jpg" alt="description" />`. Get parental consent for any student photos (RA 10173).
- **Card shuffle photos** (`index.html`) — five photos on the homepage; replace placeholder divs with `<img>` tags

### Optional
- **Stats** — update numbers in the homepage stats section
- **Quote** — change the Proverbs verse if you'd prefer a different one
- **Tagline** — currently "We make your child's world better." (your school's actual tagline)

## What's NOT in this bundle

The backend stuff is gone for the rebuild:
- ❌ No Supabase auth (no @slasm.net sign-in restriction)
- ❌ No admin dashboard
- ❌ No working contact form (uses mailto link instead)
- ❌ No multi-admin system

We'll add these back in Stage 2 once you confirm the design is right.

## Design notes

- **Palette:** Cream background, royal blue ink, warm gold accents
- **Fonts:** Fraunces (display serif) + Outfit (body)
- **Animations:** Scroll-reveal on every section, card shuffle on homepage, gallery carousels, smooth nav scroll state
- **Mobile:** All pages responsive. No "landscape only" required like the old Google Sites version.
- **Performance:** No images included yet, so the site loads near-instantly. Once you add real photos, optimize them first (under 1MB each, ideally) using a tool like [Squoosh](https://squoosh.app/).

## When you're ready for the backend

Tell me "do the backend" and I'll re-add:
- Supabase auth + @slasm.net restriction
- Admin dashboard with content management for teachers/classrooms/schedule
- Working contact form that saves to database + emails admin
- Multi-admin support

The design we built here is set up to work with that — the structure won't change, just the data source.
