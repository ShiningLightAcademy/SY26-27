# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**. Email the
school administrator at **sla@slasm.net** with details and steps to reproduce. We'll
respond as soon as we can.

## What's protected, and how

- **Authentication** is handled by Supabase Auth via Google OAuth, restricted to
  `@slasm.net` accounts.
- **Data access** is enforced server-side by Supabase **Row Level Security** policies.
  The browser uses only the public *anon* key — it cannot bypass RLS.
- The **`service_role` key must never** appear in this repository or any browser code.

## Known limitations

- The site is hosted as static files on GitHub Pages, so the HTML/CSS/JS source is
  publicly readable. The auth gate hides page **content** from anonymous visitors, but
  it is not a substitute for server-side protection of the markup itself. Sensitive
  data lives in Supabase and is protected by RLS, not by the auth gate.
