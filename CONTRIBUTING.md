# Contributing

Thanks for helping improve the Shining Light Academy website.

## Project at a glance

- **No build step.** This is plain HTML/CSS/JS. What's in the repo is what ships.
- **Deployed on GitHub Pages** from the `main` branch, root folder.
- **Backend is Supabase** (auth + Postgres + Storage). The browser only ever uses the
  public *anon* key; access is enforced by Row Level Security.

## Repository layout

```
.                     HTML pages (served at the site root — DO NOT move these)
assets/css            stylesheets
assets/images         logo, building photo, etc.
src/core              infrastructure: Supabase client + auth guard
src/app               site-wide UI behavior (main.js)
src/features          optional features (inline edit mode)
src/pages             page-specific logic (admin dashboard)
docs                  architecture / database / deployment docs
scripts               repo tooling (asset-reference checker)
.github               CI, issue/PR templates, CODEOWNERS
```

> ⚠️ **Never move the HTML pages out of the repo root.** Their URLs are registered in
> Supabase Auth (redirect allowlist) and Google OAuth. Changing them breaks sign-in.

## Making a change

1. Create a branch.
2. Edit the relevant file. For content changes, prefer the in-app **admin dashboard** or
   **inline edit mode** — most copy/data is stored in Supabase, not in the HTML.
3. Run the checks locally:
   ```bash
   npm run check:assets     # verifies every local href/src resolves
   npm run format:check     # optional: Prettier formatting
   ```
4. Open a pull request. CI runs the asset-reference check automatically.

## Local preview

```bash
npm start     # serves the folder at http://localhost:3000
```

Note: pages redirect to `login.html` because of the auth guard. Sign in with an
`@slasm.net` account to view content, or test against a Supabase project you control.

## Style

- 2-space indentation, UTF-8, LF line endings (see `.editorconfig`).
- Keep dependencies at zero — no frameworks or bundlers unless there's a clear need.
