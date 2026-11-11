# Roopkala storefront (Astro + Supabase + Cloudflare)

WhatsApp-first shop for textiles and jewellery. Reads products from Supabase; look and feel comes from a swappable theme file.

## Honest status
- **Tested offline:** all logic in `src/lib` (formatting, INR, Markdown safety, WhatsApp text, tint colours, theme/accent safety, Supabase reads with a mocked fetch, JSON-LD). 19 tests, plus a TypeScript check of `src/lib`, `src/scripts`, API routes.
- **NOT tested:** the `.astro` pages/layout and the Cloudflare build. They could not be installed or run where this was written (no network). Expect to fix small things on first run. The versions in `package.json` (`astro ^5`, `@astrojs/cloudflare ^12`) are my best guess; if `npm install` complains, send me the exact error.

## Run it
1. `npm install`
2. Copy `.env.example` to `.env` and fill `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_SITE_URL`.
3. In Supabase run `roopkala-schema.sql` (SQL editor), then follow `ROOPKALA-SETUP.md` (Google login, make yourself admin). Put your real WhatsApp number in Settings (seed value is a placeholder).
4. `npm run dev`
5. `npm test` runs the offline tests; `npm run check` type-checks.

## Deploy (Cloudflare)
Connect the repo to Cloudflare Pages, build command `npm run build`, add the same three environment variables. In Cloudflare dashboard check that "Block AI bots" is off if you want AI crawlers to read the shop (it overrides robots.txt).

## Themes
Look is `public/base.css` + `public/themes/<name>.css`. The active theme is chosen in `site_settings.appearance`. New theme = new file (see `THEME-GUIDE.md`, `THEME-TEMPLATE.css`) and add its id to `THEMES` in `src/lib/config.ts`.

## Not built yet
Admin app, login/account and cart sync, Turnstile spam protection on the enquiry form, PWA, payments, notify-me emails. The enquiry form and notify-me already write to Supabase; the admin app will read them.

## Admin (v0.2.0)
`/admin` has four tabs: **Products** (add/edit, stock rows, photos, Sold 1 / +1), **Enquiries**, **Homepage** (top carousel slides, homepage product sections, categories) and **Settings** (WhatsApp number, "few left" level, Google Analytics ID, theme and accent colour, About page, social links; payments are shown but locked). Only accounts with `role = 'admin'` in `profiles` get in; the database enforces this. In Supabase → Authentication → URL Configuration, add `<your-site>/admin` to the redirect URLs. The admin was exercised in a headless browser against a fake Supabase, not the real one. See CHANGELOG.md.
