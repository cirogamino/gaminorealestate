# Gamino Real Estate — website

Live: https://gaminorealestate.com

Static site (single `index.html` + images) with a Cloudflare Pages Function for the
rental application form (`functions/api/apply.js`). Bilingual (English default, Spanish
via toggle; form labels inline-bilingual).

## Deploy
Connected to Cloudflare Pages via Git: **every push to `main` auto-publishes**.
No build step. Output directory = repository root.

## Structure
- `index.html` — the whole site
- `*.jpg` — building photos, logos, social image
- `functions/api/apply.js` — receives form submissions (stores to LEADS KV if bound)
- `robots.txt`, `sitemap.xml` — SEO / AI-SEO
