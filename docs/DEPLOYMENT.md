# Deployment

The site is hosted on **GitHub Pages** from the `main` branch, root folder. There is no
build step: pushing to `main` publishes the files as-is (GitHub Pages redeploys in ~1
minute). `.nojekyll` is present so Pages serves the `assets/` and `src/` folders verbatim
without Jekyll processing.

- **Live URL:** https://shininglightacademy.github.io/SY26-27/
- **Repository:** https://github.com/ShiningLightAcademy/SY26-27

## ⚠️ The one rule that protects sign-in

**Do not change the URLs of the HTML pages.** The pages are served at the site root
(`/SY26-27/index.html`, `/SY26-27/login.html`, etc.), and those exact URLs are registered
in two places that this repo cannot edit:

1. **Supabase → Authentication → URL Configuration** (Site URL + Redirect URLs)
2. **Google Cloud Console → OAuth client** (Authorized origins + redirect URIs)

Moving a page into a subfolder changes its URL and **breaks Google sign-in** until someone
updates both dashboards. Assets (`assets/`, `src/`) may be reorganized freely — only the
top-level page URLs are load-bearing.

## Publishing a change

Either workflow works:

- **Web upload:** GitHub → *Add file → Upload files* → drag the changed files in → commit.
- **Git:** commit and `git push origin main`.

## One-time backend setup

1. Create a Supabase project; enable **Google** auth restricted to `@slasm.net`.
2. Run the schema/seed scripts in the Supabase SQL Editor (see DATABASE.md).
3. Put the Supabase **Project URL** and **anon public** key into
   `src/core/supabase-client.js`. Never commit the `service_role` key.
4. In Supabase → Auth → URL Configuration, set the Site URL and Redirect URLs to the
   GitHub Pages URL above.
5. Sign in once, then promote your account to admin (`profiles.role = 'admin'`).

## CI

`.github/workflows/ci.yml` runs `scripts/check-asset-refs.mjs` on every push/PR to verify
that every local `href`/`src` in the HTML resolves. It does not gate the Pages deploy, but
a red check is your early warning that a path is broken.
