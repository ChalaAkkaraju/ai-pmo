# AI PMO — Promote to Cloud (Demo Release) Runbook

A push-button sequence to stand up the shareable demo on Supabase Pro + Vercel,
starting from your local-first build. Do it once to release; repeat the short
"per-demo" section whenever you bring the cloud back up.

**Model:** you build on **local** (free). The cloud is only for sharing. When
you're not demoing, **pause** the cloud project so it costs ~$0.

**Before you start, confirm:**

- Supabase **Pro** is active and the project `pmo-llm-demo` (`edtxpjadvwsaktkvourr`) shows **Database + PostgREST = Healthy**.
- Your local stack runs (Docker up, `supabase start`), and the app works at `http://localhost:3000`.
- You have the cloud credentials in `.env.local.cloud-backup` (URL + anon + service-role key).
- Supabase CLI is installed (it is — via Scoop).

---

## Part A — One-time prep (do once)

### A1. Install the new PDF packages

The PDF route now uses a slim browser on Vercel. Install the two new packages:

```powershell
pnpm install
```

This picks up `puppeteer-core` + `@sparticuz/chromium` (cloud) and keeps full
`puppeteer` as a dev dependency (local). Then confirm the build is clean:

```powershell
npx tsc --noEmit
pnpm build
```

`pnpm build` must end with a success line (warnings OK, errors block deploy).
If `tsc` still flags `puppeteer-core` / `@sparticuz/chromium`, the install
didn't complete — re-run `pnpm install`.

### A2. Recover or regenerate the agent narratives

The schema + 99 projects rebuild for free from the generators. The only
non-reproducible data is the AI-written narratives in `agent_outputs`.

- If the old cloud is healthy: `node scripts/recover-agent-outputs.mjs --dry` then (if counts look right) `node scripts/recover-agent-outputs.mjs` — pulls them into **local**.
- If they're gone: regenerate (local Qwen = free, or the paid deep-fill) when you seed.

### A3. Bump compute Nano -> Micro (optional, ~1 min downtime)

In the Supabase dashboard, open the project -> Settings -> Compute and Disk ->
change Nano to **Micro**. Same price in a paid org, more stable. Do this when
nothing else is running (not mid-recovery, not during a demo).

---

## Part B — Seed the cloud database

> The generators read `.env.local`. To seed the **cloud**, point `.env.local` at
> the cloud, run them, then point it back at local.

### B1. Back up and switch env to cloud

```powershell
Copy-Item .env.local .env.local.local-backup -Force
Copy-Item .env.local.cloud-backup .env.local -Force
```

### B2. Apply all migrations to the cloud

```powershell
supabase link --project-ref edtxpjadvwsaktkvourr
supabase db push
```

This runs all 30 migrations (through `0030`) against the cloud — same schema as local.

### B3. Seed the portfolio + narratives

Run the same seed you used locally (procedural, free), then the narratives:

```powershell
pnpm tsx scripts/seed-all.ts
```

If you recovered narratives into local in A2, push them up too (point the
recovery script's *target* at cloud, or re-run your deep-fill against cloud).
For a quick free fill, run the agents via local Qwen against the cloud rows.

### B4. Replace the placeholder access tokens

The seeded tokens are `demo-...-token-replace-me`. Before sharing publicly,
replace them with unguessable values (Supabase Studio -> SQL editor), e.g.:

```sql
update roles set access_token = 'demo-pm-' || gen_random_uuid()
where access_token = 'demo-pm-token-replace-me';
-- repeat per role
```

Note the new tokens — they go in the demo links you share.

### B5. Switch env back to local

```powershell
Copy-Item .env.local.local-backup .env.local -Force
```

---

## Part C — Deploy the app to Railway

> Railway hosts the **Next.js app**; Supabase (Part B) still hosts the **database**.
> Railway runs a persistent Node server, so the PDF route and long agent calls
> have no serverless timeout / bundle limits — and no cold starts.

### C1. Push the code to GitHub (done)

Railway builds from GitHub on every push:

```powershell
git push origin main
```

### C2. One-time PDF-route prep for Railway

On a persistent server the simplest, most reliable PDF path is **full puppeteer**
with its bundled Chromium — and the `report-pdf` route already uses full puppeteer
whenever it is NOT on Vercel. Just make sure it's installed in production: move
`puppeteer` from `devDependencies` to `dependencies` in `package.json`, then:

```powershell
pnpm install
git commit -am "PDF: full puppeteer for the Railway persistent-server deploy"
git push origin main
```

(No `@sparticuz/chromium` gymnastics needed on Railway — that was only for Vercel's
serverless bundle limit. Leave those packages in; they're simply unused there.)

### C3. Create the Railway service + env vars

In Railway: **New Project -> Deploy from GitHub repo -> `ChalaAkkaraju/ai-pmo`**.
Railway auto-detects Next.js (Nixpacks) and runs `next build` then `next start`.
Add these 4 variables (service -> **Variables**), all pointing at the **cloud**
Supabase (from `.env.local.cloud-backup`):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the cloud URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cloud anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | cloud service-role key |
| `OPENROUTER_API_KEY` | your OpenRouter key |

Railway injects a `PORT`; `next start` respects it. If the app doesn't bind, set
the start command to `next start -p $PORT`. Then **Settings -> Networking ->
Generate Domain** for a public URL.

### C4. Deploy

Railway builds and starts automatically on push (first build takes a few minutes).
Being a persistent server, there are **no function timeouts and no cold starts** —
the long agent calls and the Chromium PDF route run without serverless constraints.

---

## Part D — Post-deploy smoke test

On the Railway URL, run the key parts of `docs/pre-deploy-checklist.md`, especially:

- Open a report -> **Download PDF** -> confirm a real, selectable-text PDF downloads.
  Full puppeteer on a persistent server should be reliable; if it errors on a
  missing system library, add it via Nixpacks (a `NIXPACKS_PKGS` variable for the
  font/nss libs) — rare with full puppeteer.
- Invoke a couple of agents including a full-mode report — confirm no timeout.

---

## Part E — Between demos (save usage)

Railway Hobby includes **$5 of usage**; a low-traffic demo stays well under it. To
trim usage between demos you can remove the service (redeploy from GitHub when
needed) or just leave it running. **Pause the Supabase project separately** to keep
DB compute at ~$0. Keep building on local the whole time.

---

## Quick reference — the per-demo loop (after one-time prep)

1. Confirm the Supabase project is Active (un-pause if needed).
2. `git push origin main` -> Railway auto-rebuilds and redeploys.
3. Share the demo links (the real tokens from B4) on the Railway domain.
4. After: pause the Supabase project (and optionally remove the Railway service).
