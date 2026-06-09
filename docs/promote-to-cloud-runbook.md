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

## Part C — Deploy the app to Vercel

### C1. Push the code to GitHub

You're ~15+ commits ahead of `origin/main`. Vercel builds from GitHub:

```powershell
git push origin main
```

### C2. Connect the repo + set environment variables

In Vercel: **New Project -> import `ChalaAkkaraju/ai-pmo`**. Add these 4
environment variables, all pointing at the **cloud** (from `.env.local.cloud-backup`):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the cloud URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cloud anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | cloud service-role key |
| `OPENROUTER_API_KEY` | your OpenRouter key (cloud uses OpenRouter, not local Qwen) |

### C3. Deploy

Click **Deploy**. First build takes a few minutes. The PDF route's 150s
`maxDuration` needs **Vercel Pro** for full-length reports (Hobby caps at 60s);
quick-mode reports finish well under 60s, so Hobby is fine for a first demo.

---

## Part D — Post-deploy smoke test

On the deployed URL, run the key parts of `docs/pre-deploy-checklist.md`, and
especially **validate the PDF fix** (this is the part that only proves out on
Vercel):

- Open a report -> **Download PDF** -> confirm a real, selectable-text PDF downloads.
- If the PDF route errors, check the version pairing of `puppeteer-core` <-> `@sparticuz/chromium` (they must match a common Chrome version) and the Vercel function logs.

---

## Part E — Between demos (save compute)

When you're done showing it: Supabase dashboard -> project -> **Pause**. Paused =
~$0 compute. Un-pause a few minutes before the next demo. Keep building on local
the whole time.

---

## Quick reference — the per-demo loop (after one-time prep)

1. Un-pause the cloud project (or confirm Active).
2. `git push origin main` (if code changed) -> Vercel auto-redeploys.
3. Share the demo links (the real tokens from B4).
4. After: pause the cloud project.
