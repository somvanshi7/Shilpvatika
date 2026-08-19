# GrainEdge Quotation Micro-Site

A standalone, production-ready micro-site for generating, previewing, and downloading branded PDF quotations for GrainEdge Interiors.

## Architecture Highlights
- **Frontend:** React + Vite SPA
- **Backend:** Netlify Functions (Modern API)
- **PDF Engine:** Puppeteer + `@sparticuz/chromium-min` (Running in a Background Function)
- **Storage:** Netlify Blobs (Zero-config, built-in)
- **Email:** SendGrid
- **Routing:** `/q/:slug` routes dynamically serve server-rendered HTML for perfect link previews (WhatsApp/Slack).

## Setup & Local Development

This project is configured to run locally using the Netlify CLI to properly emulate serverless functions, blobs, and background functions.

### 1. Install Dependencies

```bash
cd grainedge-quote
npm install
npm install -g netlify-cli
```

### 2. Environment Variables

Create a `.env` file in the root (copy from `.env.example`).

```env
APP_BASE_URL=http://localhost:8888
ADMIN_AUTH_SECRET=your-secret-password

# Optional for local dev:
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=quotes@grainedge.in
```

### 3. Start Local Server

**Important:** Do NOT use `npm run dev`. You must use `netlify dev` to start both the Vite frontend and the Netlify Functions backend.

```bash
npx netlify dev
```

The site will be available at `http://localhost:8888`.

### 4. Seed Test Data

To populate the local Blobs storage with 5 sample quotes:

```bash
npx netlify dev --exec node seed-data.mjs
```

## Deployment to Netlify (Testing & Production)

This project is built to deploy seamlessly to Netlify without configuration changes.

1. Create a new site on Netlify.
2. Link it to your Git repository (or use Netlify CLI: `netlify init`).
3. Set the Build Command: `npm run build`
4. Set the Publish Directory: `dist`
5. Add the Environment Variables in the Netlify UI:
   - `APP_BASE_URL` (e.g., `https://quote.grainedge.in` or `https://quote.grainedge.netlify.app`)
   - `ADMIN_AUTH_SECRET`
   - `SENDGRID_API_KEY` (Required in prod)
   - `EMAIL_FROM_ADDRESS`
   - `SALES_NOTIFY_EMAIL`

### Switching to a Custom Domain

To move from the `quote.grainedge.netlify.app` testing domain to a production domain (e.g., `quote.grainedge.in`):

1. Go to Netlify Site Settings > Domain Management.
2. Add the custom domain.
3. Update your DNS records as instructed by Netlify (usually a CNAME record pointing to your `.netlify.app` domain).
4. Update the `APP_BASE_URL` environment variable to match the new domain.
5. **No code changes are required.** The app uses relative API calls and reads the `APP_BASE_URL` for absolute links (like emails and WhatsApp sharing).

## Security & Admin

- **Unguessable Links:** Quotes are generated with a `GRD-YYYYMMDD-XXXXXX` slug (using cryptographic random bytes) so they cannot be enumerated.
- **Admin Access:** The admin dashboard at `/admin` requires the `ADMIN_AUTH_SECRET`. This is a simple, stateless bearer token approach suitable for internal tools.
