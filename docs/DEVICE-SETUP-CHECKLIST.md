# AI PMO — New-Device / Local-Dev Setup Checklist

How to bring `pmo-llm-demo` up on a fresh machine (or after a device migration).
The code and git history travel with the folder; **the machine-level tooling does
not** — that's where every snag in this list came from.

## 0. What doesn't come across in a folder copy

These live at the machine level and must be set up on each new device:

- Docker Desktop (+ Windows virtualization)
- Node.js (as a **system** install, not only fnm — see gotcha below)
- pnpm (via Corepack)
- GitHub Desktop's list of local repos (per-machine, not data)

## 1. Reconnect the repo in GitHub Desktop

GitHub Desktop showing "Let's get started!" is **not** data loss — its repo list is
per-machine. Re-add the existing clone:

- File → **Add Local Repository** → select `pmo-llm-demo`.
- History, branches (`staging`), and the `origin` remote load automatically.
- Check **Stash** — stashes live only in `.git` and are the one thing not on GitHub.

## 2. Docker Desktop

The local Supabase stack is Docker containers, so Docker's engine must be green first.

- If Docker says **"Virtualisation support not detected"**: that's Windows/BIOS, not Docker.
  (The "Sign in" prompt on that screen is a red herring — it won't fix it.)
  1. Task Manager → Performance → CPU → confirm **Virtualization: Enabled**. If Disabled,
     enable **Intel VT-x** / **AMD SVM** in BIOS/UEFI.
  2. Admin PowerShell: `wsl --install`
  3. Admin PowerShell: `bcdedit /set hypervisorlaunchtype auto`
  4. **Reboot.**
- Confirm the Engine shows "running" (bottom-left) before continuing.

## 3. Node.js — must be on a STABLE PATH

**Gotcha (cost the most time):** Node was installed via **fnm**, which serves Node from a
per-terminal temp folder. Your interactive shell sees it, but when **pnpm spawns a build
script**, that child process does *not* get fnm's path → `'node' is not recognized` →
every postinstall (esbuild, sharp, the Supabase CLI wrapper) fails.

Fix — install Node LTS system-wide so a stable `C:\Program Files\nodejs\node.exe` is on
the machine PATH that child processes inherit:

```powershell
winget install OpenJS.NodeJS.LTS
```

Then **open a fresh terminal** and confirm a child process can see Node (this is the real test):

```powershell
cmd /c "node -v"
```

It must print a version. fnm still works alongside it for version switching.

## 4. pnpm (via Corepack)

```powershell
corepack enable pnpm
```

Corepack pins the version from `package.json` → `packageManager`. To upgrade deliberately:
`corepack use pnpm@latest`, then `pnpm install`, then commit `package.json` + `pnpm-lock.yaml`.

**pnpm v11 note:** build-script allowlisting moved out of the `package.json` `pnpm` field
into `pnpm-workspace.yaml` → `allowBuilds:` (a map). The `pnpm` field is now ignored — keep
the allowlist in `pnpm-workspace.yaml`.

## 5. Install & build deps

```powershell
pnpm install
pnpm rebuild        # compiles native deps (sharp, esbuild, unrs-resolver) for THIS machine
```

Don't trust native binaries copied from another device — rebuild them.

## 6. Supabase CLI

It's now a dev dependency (`pnpm add -D supabase` if missing). Verify:

```powershell
pnpm supabase --version
```

If it errors with a missing `dist/supabase.js`, the package half-installed — reinstall it:
`pnpm remove supabase; pnpm add -D supabase`.

## 7. Start the local Supabase stack

```powershell
pnpm supabase start
```

First run pulls the Docker images (several minutes) and applies all migrations under
`supabase/migrations`. It prints local endpoints + keys. **The new CLI issues the new key
format** (`sb_publishable_…` / `sb_secret_…`), which are drop-in replacements for the old
`anon` / `service_role` keys. All values are local-only (safe, non-production).

Local endpoints: API `http://127.0.0.1:54321` · Studio `http://127.0.0.1:54323` ·
Postgres `54322` · Mailpit `54324`.

## 8. Point `.env.local` at local

`.env.local` selects which Supabase the app talks to. Variants on disk:
`.env.local.local-backup` (local), `.env.local.qa` (cloud QA), `.env.local.cloud-current` (cloud prod).

For local dev, base it on the local backup and swap in the running stack's keys
(`.env` files can't be written by remote tools — do this in the terminal):

```powershell
$dir = "C:\Claude\Projects\PMO LLM\pmo-llm-demo"
$c = Get-Content "$dir\.env.local.local-backup" -Raw
$c = $c -replace '(?m)^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*$','NEXT_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_ from supabase start>'
$c = $c -replace '(?m)^SUPABASE_SERVICE_ROLE_KEY=.*$','SUPABASE_SERVICE_ROLE_KEY=<sb_secret_ from supabase start>'
[System.IO.File]::WriteAllText("$dir\.env.local", $c, (New-Object System.Text.UTF8Encoding($false)))
```

Required vars: `NEXT_PUBLIC_SUPABASE_URL` (= `http://127.0.0.1:54321`),
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret),
`OPENROUTER_API_KEY` (keep from backup — needed for agent calls).

## 9. Seed — TWO separate steps

```powershell
pnpm seed          # projects, issues, risks, change orders, variance, agent outputs, worked examples
pnpm seed:users    # Supabase Auth accounts from users.seed.json (login accounts)
```

Both are needed. Skipping `seed:users` = "Invalid Login ID or password" at login.

## 10. Run

```powershell
pnpm dev
```

Open **http://localhost:3000/login**. Sign in with **email + password** (Login ID is the
full email). Demo password: `AIPMO2026`. Accounts are keyed by role in `users.seed.json`
(e.g. PM `j.okafor@demo.aipmo.local` — full portfolio + all 15 agents).

---

### One-liner recovery (once Docker + system Node exist)

```powershell
corepack enable pnpm; pnpm install; pnpm rebuild; pnpm supabase start
# set .env.local (step 8), then:
pnpm seed; pnpm seed:users; pnpm dev
```
