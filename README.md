# POW! Grind Tracker

A neo-brutalist pop-art dashboard for tracking DSA progress, daily missions, and gym attendance. Built with Next.js 16, Tailwind CSS, and Supabase.

## Requirements

- Node.js 20.9 or newer
- A Supabase project

## Local setup

1. Install dependencies and the browser used by two profile scrapers:
   ```bash
   npm install
   npx playwright install chromium
   ```
2. In Supabase, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Insert your platform handles into `profiles` (an example is at the bottom of the schema file).
4. Create a local environment file and fill in the values:
   ```bash
   cp .env.example .env.local
   ```
   Keep `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` private; never expose them as `NEXT_PUBLIC_*` variables or commit `.env.local`.
5. Start the app:
   ```bash
   npm run dev
   ```
   If the Supabase public URL or anon key is missing, the dashboard displays a setup warning. A production build can still be generated without those values.
6. Trigger a first snapshot (load the local secret into your shell first):
   ```bash
   set -a; source .env.local; set +a
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync
   ```
   Run the sync on at least two different days before daily deltas and the heatmap can show activity.

## Validation

```bash
npm run typecheck
npm run build
```

## Midnight sync

`vercel.json` runs `/api/cron/sync` at `30 18 * * *` UTC (00:00 IST). Vercel sends `CRON_SECRET` as a bearer token automatically. Playwright is heavy for Vercel's serverless runtime; for the browser-based scrapers, host the app on a compatible service with a system cron or move those scrapers into a GitHub Actions workflow.

## Known gaps

- LeetCode uses its GraphQL endpoint; CodeChef and GFG parse page HTML/JSON. These integrations can break when the sites change.
- Coding Ninjas and TakeUForward URLs and selectors in `lib/scrapers.ts` are best-effort and may need adjustment for your profiles.
- Supabase policies are intentionally open for a single-user setup. Add Supabase Auth and per-user policies before sharing the app.
