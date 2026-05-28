# AI PMO — Pre-Deploy Testing Checklist

Run through this once before deploying to Vercel. Designed for ~45 minutes of focused testing — substantial enough to catch the failures that would embarrass in production, brief enough that you'll actually do it.

Tick each box as you go. If anything fails, note it under "Issues found" at the bottom. Don't deploy until every must-pass item is green.

**Prerequisites before starting:**

- [ ] Windows dev server is running (`pnpm dev` in PowerShell, no errors in terminal)
- [ ] Browser open to `http://localhost:3000`
- [ ] Supabase dashboard accessible in another tab (handy for verifying writes)
- [ ] Browser DevTools open in a second window (`F12`) — keep an eye on Console tab for red errors

---

## Section 1 — Landing & authentication (5 min)

- [ ] `http://localhost:3000/` renders the AI PMO landing page (✨ brand mark, "AI PMO" heading, list of access tokens for each colleague role)
- [ ] No "PMO LLM" text anywhere on the landing page (should be fully rebranded)
- [ ] An invalid token like `/access/totally-fake-token` redirects to a 404 / "not found" page
- [ ] Clicking each role's access link loads the dashboard for that role without error:
  - [ ] Senior PM / PMO Director — J. Okafor (`demo-pm-token-replace-me`)
  - [ ] Portfolio Procurement Strategist — M. Patel (`demo-procurement-token-replace-me`)
  - [ ] Portfolio Risk Analyst — R. Yuen (`demo-risk-token-replace-me`)
  - [ ] VP Sponsor — L. Andersen (`demo-sponsor-token-replace-me`)
  - [ ] Commercial Manager — A. Whitfield (`demo-commercial-token-replace-me`)
  - [ ] Project Controls Manager — K. Müller (`demo-project-controls-token-replace-me`)
  - [ ] Program Manager (Renewables) — S. Park (`demo-program-manager-token-replace-me`)
  - [ ] Engineering Manager — D. Sato (`demo-engineering-manager-token-replace-me`)
  - [ ] Construction Manager — T. O'Brien (`demo-construction-manager-token-replace-me`)
  - [ ] HSE Manager — F. Mahmoud (`demo-hse-manager-token-replace-me`)
- [ ] The header bar shows the correct colleague name and role for the token you used

---

## Section 2 — Dashboard (PM Director role) (10 min)

Use the PM Director token for the deepest coverage.

**Header & branding:**

- [ ] Brand mark (✨ AI PMO + "for Project Management Office" tagline) visible top-left
- [ ] "Agents" link in top-right navigates to `/access/<token>/agents` (test the link)
- [ ] Colleague name (e.g., "J. Okafor") and role display visible top-right

**Ribbon 1 — Portfolio KPIs:**

- [ ] 6 KPI cards visible: Contract value, Approved budget, Active projects, Avg CPI/SPI, Open H issues, Realised risks
- [ ] Values look plausible (e.g., total contract value is in billions, not zero)
- [ ] Avg CPI/SPI card has tone color (warn/ok) consistent with the values
- [ ] Open H issues + realised risks have warn tone if count > 0

**Ribbon 2 — Theme cards:**

- [ ] 4 segment cards visible: Renewables, Water, Industrial, Power
- [ ] Each card shows project count, contract value, status breakdown
- [ ] Clicking a card expands an inline drill-down with project grid below
- [ ] "Collapse" button hides the drill-down
- [ ] Selecting a different theme card swaps the drill-down to that segment

**Hot 5 panel:**

- [ ] "Top projects of concern" section is visible
- [ ] 5 projects listed with composite scores
- [ ] Each row clickable, leads to the project detail page

**Activity feed (Recent agent activity):**

- [ ] "LIVE" badge visible next to the section title
- [ ] Cards show colleague name, role chip, agent, time-ago, and prompt preview
- [ ] Clicking a card expands to show full response inline
- [ ] Top of expanded card has the dark slate strip with "↗ Show full report" + "Collapse ▴" buttons
- [ ] Collapsing the card hides the response
- [ ] Empty-state message ("No agent activity yet... use the floating ✨ Ask AI Assistant button...") shows if no activity exists

---

## Section 3 — Project detail page (10 min)

Click into one of the Hot 5 projects (e.g., the top item).

**Project header:**

- [ ] Project code (e.g., `NW-PWR-2686`), name, client, segment, status visible
- [ ] BI strip shows CPI/SPI gauges, contingency bar, risk donut
- [ ] Current week + status indicator

**Tabs render and switch cleanly:**

- [ ] Risks tab loads — 3×3 risk heatmap visible above table, table populated, all risks have valid status
- [ ] Issues tab loads — table populated, H-severity items color-coded
- [ ] Change orders tab loads — CO table populated (may be empty for some projects)
- [ ] Variance tab loads — CPI/SPI trend chart + contingency burn-down both render without NaN errors
- [ ] Charter tab — markdown content visible, "↗ Show full report" button above
- [ ] Stakeholders tab — markdown content visible (or empty state)
- [ ] WBS tab — hierarchical tree view visible above markdown
- [ ] Schedule tab — Gantt strip visible above markdown
- [ ] Budget tab — markdown content visible
- [ ] Comms tab — markdown content visible
- [ ] Lessons tab — markdown content visible
- [ ] Closeout tab — markdown content visible

**Test the "↗ Show full report" button on one planning tab:**

- [ ] Click "↗ Show full report" on the Charter tab
- [ ] New tab opens to `/access/<token>/report/<output-id>`

---

## Section 4 — Visualizations close inspection (5 min)

These are the parts most likely to break visually in production.

**Risk heatmap (3×3):**

- [ ] Probability axis labeled L/M/H, Impact axis labeled L/M/H
- [ ] Cells color-coded (low=green, mid=amber, high=red)
- [ ] Each cell shows count of risks in that probability×impact bucket
- [ ] Cells with 0 risks are visibly distinct from cells with counts

**Variance trend chart:**

- [ ] CPI line visible across weeks
- [ ] SPI line visible across weeks
- [ ] Contingency burn-down area chart visible
- [ ] Y-axis labels have sensible precision (not "0.93000000")
- [ ] No NaN values in tooltips on hover

**Gantt schedule strip:**

- [ ] Phases render as colored bars (amber=Active, teal=SC, slate=Closed)
- [ ] Current-week marker visible
- [ ] No overlapping/crushed bars

**WBS tree view:**

- [ ] Hierarchical layout, not flat list
- [ ] Section headings distinguishable from leaf items
- [ ] Project root demoted (doesn't dominate the layout)

---

## Section 5 — Floating AI Assistant widget (10 min)

This is the highest-traffic interactive component.

**Collapsed state:**

- [ ] Black pill button "✨ Ask AI Assistant" visible bottom-right on every page
- [ ] Clicking opens the chat panel

**Expanded panel:**

- [ ] Dark slate header with gold ✨ icon + "Ask AI Assistant" title
- [ ] Subtitle shows role + context (either "Portfolio" or current project code)
- [ ] "Pick agent" dropdown defaults to "Auto"
- [ ] Dropdown lists all agents available to the current role
- [ ] Placeholder text in the textarea is role-appropriate
- [ ] "×" close button works, panel closes cleanly

**Quick-mode invocation (auto-routed):**

- [ ] From dashboard, type a portfolio-level prompt (e.g., "Which three projects need attention this week?") and hit Send
- [ ] "Calling…" appears immediately
- [ ] Response arrives within ~15 seconds
- [ ] Response card shows "Auto → <Specialist Name>" header (e.g., "Auto → Portfolio Risk Reviewer")
- [ ] Markdown rendering shows colored callouts: amber for "Caveat:", sky for "Recommendation:", emerald for "Action:" / "Next step:" (if the response contains them)
- [ ] Footer shows duration in seconds + "↗ Show full report" button

**Override the router:**

- [ ] Switch dropdown to a specific agent (e.g., "Variance Analyst")
- [ ] Send another prompt
- [ ] Response card header says the agent name directly (no "Auto →" prefix)

**Context awareness:**

- [ ] Navigate to a project detail page
- [ ] Open floating widget — subtitle should now say "context: <project-code>"
- [ ] Invoke an agent — response should be project-scoped, citing that project's data

**Read-only role (if testing as Sponsor):**

- [ ] Open widget as Sponsor (whose can_write is false)
- [ ] Textarea should be disabled with "Read-only role" placeholder
- [ ] Send button disabled

---

## Section 6 — Polished report viewer (10 min)

The path you most recently built — needs careful coverage.

**Open a report from the activity feed:**

- [ ] On dashboard, expand any activity card
- [ ] Click "↗ Show full report" in the dark strip at the top
- [ ] New browser tab opens to `/access/<token>/report/<output-id>`

**Initial load state:**

- [ ] Sky-blue banner at top: "Generating the full long-form report. This usually takes 25–40 seconds..."
- [ ] Download PDF button shows spinner + "Preparing report…" (disabled)
- [ ] The quick brief is visible below the banner (page isn't blank)

**After ~30 seconds:**

- [ ] Banner disappears
- [ ] Download PDF button becomes active, shows "↓ Download PDF" with gold accent
- [ ] Page now shows the full long-form content (more `## Section` headings, longer paragraphs than the brief)
- [ ] Letterhead at top: ✨ AI PMO + "Project Management Office" tagline (left), "STATUS REPORT" + date + generated time (right)
- [ ] Title block: report title + project code/name/segment/client OR "Portfolio-level" badge
- [ ] Meta strip (4 columns): Prepared by, Requested by, For, Methodology
- [ ] Request quote block (italic, in slate-50 panel with left border)
- [ ] Either "Summary + Full detail" two-tier OR single flowing body (depending on whether the markdown has H2 sections)
- [ ] Footer: "Generated by AI PMO · Methodology: PMBOK 7..."

**Test the cache:**

- [ ] Refresh the page (F5 or Ctrl+R)
- [ ] Full version should appear INSTANTLY (no spinner, no 30-second wait) — confirms sessionStorage cache is working
- [ ] No new LLM invocation should fire (verify by checking the activity feed on the dashboard — no new entry)

**Download PDF:**

- [ ] Click "↓ Download PDF"
- [ ] Button changes to "Generating PDF…" with spinner (~2-3 seconds)
- [ ] Browser triggers a file download
- [ ] File name format: `AI-PMO-<AgentSlug>-<ProjectCode-or-Portfolio>-<YYYY-MM-DD>.pdf`
- [ ] Open the downloaded PDF — verify it contains the report content
- [ ] PDF does NOT show the app navigation header (the duplicate "✨ AI PMO" strip at the top of the screen)
- [ ] PDF does NOT show the floating "Ask AI Assistant" button
- [ ] Page breaks look reasonable (no orphaned headings on their own line)

**Test reports from other surfaces:**

- [ ] On a project page, go to Charter tab → click "↗ Show full report" → polished view opens
- [ ] In the floating widget, send a new prompt → after response, click "↗ Show full report" in the response footer → polished view opens

---

## Section 7 — Agents catalog page (5 min)

- [ ] Navigate to `/access/<token>/agents`
- [ ] Page title: "Agents available to you"
- [ ] Intro paragraph correctly states the count (e.g., "you can invoke 13 of 13 specialists" for PM)
- [ ] References "the floating ✨ Ask AI Assistant button" (NOT "Ask agent")
- [ ] All 13 agents listed
- [ ] Agents your role CAN invoke shown in full color
- [ ] Agents your role CANNOT invoke shown muted with "Not in your role" pill
- [ ] Each card has: name, purpose, scope badge, does[] list, doesNot[] list, sample prompt, methodology
- [ ] Test as Sponsor too — far fewer agents should be enabled

---

## Section 8 — Live activity feed (Realtime) (5 min)

Verify the cross-session broadcast still works.

- [ ] Open dashboard in browser tab A (e.g., as PM Director)
- [ ] Open dashboard in browser tab B (different colleague, e.g., Procurement Strategist) — use a different role token
- [ ] In tab B, invoke an agent via the floating widget
- [ ] Switch back to tab A — within ~2 seconds, the new activity should appear in the "Recent agent activity" feed
- [ ] New entry has a brief highlight animation (CSS flash) for the first few seconds
- [ ] Feed caps at 5 entries (older ones drop off)

---

## Section 9 — Error / edge cases (3 min)

- [ ] Empty prompt (just spaces) — Send button should be disabled, can't submit
- [ ] Try invoking an agent that requires a project_code from a portfolio-level page (e.g., Charter Drafter from dashboard) — should either auto-route to a portfolio-level agent OR return a sensible error message
- [ ] Click "Show full report" twice quickly — second click should be ignored while first is in flight (no duplicate calls)
- [ ] Navigate around with browser back/forward buttons — pages should re-render without console errors

---

## Section 10 — Browser console hygiene (2 min)

- [ ] Open DevTools (F12) → Console tab
- [ ] Refresh the dashboard
- [ ] Browse through 3-4 project pages
- [ ] Open the floating widget, invoke an agent
- [ ] Open a report, download a PDF
- [ ] **Scan the Console** — note any RED errors (warnings in yellow are usually fine)
- [ ] If you see red errors, capture screenshots before fixing

Common acceptable warnings:
- `Download the React DevTools` — informational
- Hydration warnings on dev-only — usually fine in production
- Fast Refresh messages — dev-only

Unacceptable (must fix before deploy):
- `TypeError`, `ReferenceError`, `SyntaxError` in your own code
- `Failed to fetch` for Supabase or OpenRouter calls
- 500 errors in the Network tab

---

## Section 11 — Vercel readiness (final 5 min)

Things that matter specifically for the cloud deploy:

- [ ] Confirm `.env.local` has all 4 required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`
- [ ] `.env.local` is gitignored (run `git status .env.local` — should say "ignored" or not show it)
- [ ] `package.json` has `"build": "next build"` and `"start": "next start"` scripts (Vercel uses these)
- [ ] Run `pnpm build` locally to confirm the production build succeeds:
  ```
  pnpm build
  ```
  Should end with "✓ Compiled successfully" (warnings OK; errors block deploy)
- [ ] If `pnpm build` errors, fix before deploying — Vercel will fail with the same error
- [ ] The longest-running API call (full-mode regeneration) should complete under 60 seconds — Vercel Hobby tier times out at 60s. The `maxDuration: 60` is already set on `/api/agent`. Note that close-to-the-limit invocations may sometimes time out under cold-start conditions; if so, Vercel Pro raises the limit to 300s.

---

## Issues found during this test

Note any problems below. Address must-fix items before deploying.

```
Issue 1:
  Where:
  What happened:
  Severity (blocker / nice-to-fix / cosmetic):

Issue 2:
  Where:
  What happened:
  Severity:

...
```

---

## Sign-off

- [ ] All sections complete
- [ ] All RED console errors resolved
- [ ] `pnpm build` succeeds
- [ ] Issues list is empty OR all items marked nice-to-fix/cosmetic (no blockers)
- [ ] Ready to deploy to Vercel

**Tested by:** _________________
**Date:** _________________
**Build commit:** _________________ (run `git log -1 --oneline` to get)
