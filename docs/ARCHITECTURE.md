# Architecture

A static, login-gated single-school portal. No framework, no build step — the browser
loads the HTML, which pulls in CSS from `assets/` and JavaScript from `src/`, and all
dynamic data comes from Supabase at runtime.

## Layered source layout

```
src/
  core/        Infrastructure that everything depends on
    supabase-client.js   Creates the Supabase client; exposes the window.sla API
    auth-guard.js        Session check + redirect + nav user menu (+ maintenance screen)
  app/         Site-wide presentation
    main.js              Nav, scroll reveals, carousels, intro/confetti, announcements
  features/    Optional, self-contained capabilities
    edit-mode.js         Inline on-page text editing for admins (data-content-key)
  pages/       Page-specific controllers
    admin.js             The entire admin dashboard

assets/
  css/         styles.css (site), admin.css (dashboard)
  images/      logo + building photo
```

The HTML pages stay at the **repository root** by design (see DEPLOYMENT.md).

## Script load order (every protected page)

```
1. @supabase/supabase-js          (CDN)
2. src/core/supabase-client.js    -> defines window.sla
3. src/core/auth-guard.js         -> redirects to login.html if no session
4. src/features/edit-mode.js      -> admin-only inline editing (no-op for others)
   ... page content ...
5. src/app/main.js                -> UI behaviors (footer of the page)
   (admin.html loads src/pages/admin.js instead of main.js)
```

`window.sla` is the single integration point: `getSession`, `getUser`, `getProfile`,
`isAdmin`, `requireAuth`, `requireAdmin`, `signInWithGoogle`, `signOut`, presence
helpers, and `db` (the raw Supabase client).

## Request / auth flow

```
Visitor → any page
  → auth-guard.js checks Supabase session
      no session → redirect to login.html → Google OAuth (@slasm.net only) → back to page
      session    → render; data fetched from Supabase under Row Level Security
                   admins additionally see edit mode + the Admin panel link
```

## Data flow

Pages render dynamic content by querying Supabase tables directly through `window.sla.db`
(see DATABASE.md). Writes happen only from the admin dashboard and inline edit mode, and
are authorized server-side by RLS policies — the client cannot bypass them.

## Conventions

- Zero runtime dependencies; vanilla JS in IIFEs.
- 2-space indent, UTF-8, LF (`.editorconfig`).
- New shared utilities belong in `src/lib/`; new page controllers in `src/pages/`.
