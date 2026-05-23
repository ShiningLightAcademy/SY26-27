/* ============================================================
   SHINING LIGHT ACADEMY — Supabase Configuration
   
   STEP 1: After creating your Supabase project, go to:
           Project Settings → API
           
   STEP 2: Replace the two values below with your real values.
           - SLA_SUPABASE_URL is your Project URL
           - SLA_SUPABASE_KEY is your "anon public" key (safe to expose)
   
   STEP 3: Save this file and re-upload to GitHub.
   
   These are PUBLIC values — they're meant to be in browser code.
   Do NOT paste the "service_role" key here. That one is secret.
   ============================================================ */

const SLA_SUPABASE_URL = 'https://ntpuphgzitsqyenbjqse.supabase.co'';
const SLA_SUPABASE_KEY = 'sb_publishable_ixh2sWvMEplw3-khUJOT4Q_hf572A0o';

// Domain restriction — only emails ending in this domain can access the site.
const SLA_ALLOWED_DOMAIN = '@slasm.net';

// Admin restriction — only this exact email can access admin.html
// and write to the database. Must match the email in your SQL policies.
const SLA_OWNER_EMAIL = 'rongtangco0621@slasm.net';
