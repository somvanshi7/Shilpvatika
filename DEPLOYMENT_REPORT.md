# GrainEdge Full Project — Deployment Report

## Architecture

The deployment is structured as a **single Netlify site**:

| URL Path | What it serves |
|---|---|
| `/` | **Quote Form** — React SPA homepage (create new quotation) |
| `/admin` | **Admin Dashboard** — protected quote management view |
| `/success/:slug` | **Success Page** — share buttons after quote creation |
| `/q/:slug` | **Quote Preview** — server-rendered HTML via Netlify Function |
| `/api/*` | **Serverless API** — Netlify Functions for CRUD and PDF |
| `/showcase.html` | **Main GrainEdge Showcase Site** (static HTML) |
| `/design-ideas.html` | **Design Ideas** (static HTML) |

### Build Flow
1. `npm run build:all` (root) →
2. `cd grainedge-quote && npm install && npm run build` (builds React SPA to `grainedge-quote/dist/`) →
3. `node build.mjs` (copies React dist to root `dist/`, adds showcase pages and images alongside)

### Functions
All serverless functions live in `grainedge-quote/netlify/functions/`:
- `create-quote` — POST: validate form, store metadata + HTML, trigger PDF
- `generate-pdf` — Background: renders A4 PDF via Puppeteer
- `get-quote` — GET: poll quote status
- `serve-quote` — GET: serve quote HTML at `/q/:slug`
- `download-pdf` — GET: stream PDF download
- `list-quotes` — GET: admin listing (auth required)
- `update-quote` — PATCH: admin status updates (auth required)

---

## How to Push to GitHub

Open terminal in project root (`CarpentryShowcase`) and run:

```bash
git init
git add .
git commit -m "Initial import of GrainEdge full project"
git branch -M main
git remote add origin https://github.com/somvanshi7/grainedge-full.git
git push -u origin main
```

> Create the repository first at https://github.com/new if it doesn't exist.

---

## How to Deploy on Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Select GitHub → choose `somvanshi7/grainedge-full`
3. Netlify auto-detects settings from `netlify.toml`:
   - **Build command:** `npm run build:all`
   - **Publish directory:** `dist`
4. Add **Environment Variables** before deploying:

| Variable | Value |
|---|---|
| `APP_BASE_URL` | `https://your-site-name.netlify.app` |
| `ADMIN_AUTH_SECRET` | `GE-Secure-Admin-2026!` |
| `SENDGRID_API_KEY` | *(leave blank for now)* |
| `EMAIL_FROM_ADDRESS` | `quotes@grainedge.in` |
| `SALES_NOTIFY_EMAIL` | `sales@grainedge.in` |
| `STORAGE_PROVIDER` | `netlify` |
| `PDF_RENDER_TIMEOUT_MS` | `60000` |

5. Click **Deploy site**

---

## Switching to Custom Domain

1. In Netlify: **Site Settings** → **Domain Management** → **Add custom domain** (e.g. `quote.grainedge.in`)
2. In your DNS provider: add a **CNAME** record: `quote` → `your-site-name.netlify.app`
3. Update `APP_BASE_URL` env var to `https://quote.grainedge.in`
4. Trigger a re-deploy. **No code changes needed.**

---

## Admin Access
- **URL:** `/admin`
- **Secret:** `GE-Secure-Admin-2026!`

---

## Bugs Fixed in This Update
1. **Root `package.json` build script** was overwritten to just `vite build` (does nothing). Fixed to properly chain quote app install + build + assembly.
2. **Build assembly** was nesting the React app under `/quote/` subpath, breaking all asset loading (Vite assets are root-relative). Fixed: React SPA is now the root `index.html`, showcase site becomes `showcase.html`.
3. **Root `netlify.toml`** was missing SPA catch-all and had wrong redirect for `/quote/*`. Fixed with proper redirect chain.
4. **`serve-quote.mts`** was parsing slug from URL path (fragile when Netlify rewrites URLs). Fixed to read slug from query params set by the `netlify.toml` redirect.
5. **`serve-quote.mts`** had a `config.path` export that conflicted with the `netlify.toml` redirect. Removed.
6. **`grainedge-quote/package.json`** had serverless runtime deps in `devDependencies`. Moved to `dependencies` so they're available in production.
7. **Nested `grainedge-quote/netlify.toml`** deleted — Netlify only reads the root config, and the nested one caused confusion.
8. **`.gitignore`** wildcard `.env.*` was excluding `.env.example`. Fixed to explicit list.
9. **React Router routes** in `App.jsx` had mismatched paths (`/quote/success/:slug` vs `/success/:slug`). Normalized to clean paths.
