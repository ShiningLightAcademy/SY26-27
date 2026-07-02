# Database (Supabase)

All dynamic content lives in Postgres tables protected by Row Level Security (RLS).
The browser uses only the public *anon* key; RLS decides what each signed-in user can
read or write. Uploaded images go to a Supabase **Storage** bucket named `sla-media`.

## Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-in user: `email`, `full_name`, `role` (`member`/`admin`), `is_main_admin`, `is_active`, `last_seen_at`. |
| `contact_messages` | Contact-form submissions: `first_name`, `last_name`, `email`, `subject`, `message`, `is_read`, `received_at`. |
| `teachers` | Faculty cards: `full_name`, `role`, `photo_url`, `sort_order`, `is_visible`, and contact fields (`email`, `whatsapp`, `tm_smart`, `globe`, `zoom_link`, `meeting_id`, `passcode`). |
| `schedule_links` | Per-grade schedule URL, grouped by `level_group`, ordered by `sort_order`. |
| `classroom_links` | Per-grade Google Classroom URL, grouped by `level_group`. |
| `portfolio_subjects` | Per-grade subject `subject_name` + `color_hex` + `color_label`. |
| `announcements` | `title`, `body`, optional `link_text`/`link_url`, `is_active`. |
| `home_shuffle_images` | Homepage rotating cards: `image_url`, `caption`, `alt_text`, `is_visible`, `sort_order`. |
| `site_content` | Key/value overrides for editable site text (`key`, `value`, `updated_by`). |
| `site_settings` | Global flags such as `public_visible` (maintenance mode). |
| `gallery_sets` | A gallery section: `title`, `meta`, `event_date`, `size_class` (`small`/`medium`/`large`/`full`), `layout` (`landscape`/`portrait`), `is_visible`, `sort_order`. |
| `gallery_photos` | Photos in a set: `set_id`, `photo_url`, `alt_text`, `caption`, `sort_order`. |

## Access model (enforced by RLS)

- **Read:** signed-in `@slasm.net` users can read public content tables.
- **Write:** restricted to users whose `profiles.role = 'admin'` and `is_active = true`.
- **Admin management & maintenance toggle:** restricted to `is_main_admin`.
- `contact_messages`: anyone signed in can insert (submit the form); only admins can read.

## Notes

- Schema and seed scripts are run once in the Supabase **SQL Editor**; they are not part
  of the deployed site.
- Incremental schema / data changes live in [`docs/migrations/`](migrations/). Run each
  `.sql` file once in the SQL Editor. Recent:
  - `2026-07-02_gallery_layout.sql` — adds the `gallery_sets.layout` portrait/landscape option.
  - `2026-07-02_grade12_single.sql` — collapses Senior High to a single "Grade 12" in
    `schedule_links` / `classroom_links` (renames STEM, removes HUMSS).
- The editable-text keys (`site_content.key`) correspond to `data-content-key` attributes
  in the HTML and to the field list in `src/pages/admin.js` (Site text view).
