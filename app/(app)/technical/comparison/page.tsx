/**
 * Technical · AI PMO vs SAP's AI agents — agent-by-agent comparison (research,
 * June 2026). Reference page. Valid token only.
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ token: string }>; }

type Close = 'Closest match' | 'Partial' | 'Name-only' | 'No equivalent';
const CLOSE_CLS: Record<Close, string> = {
  'Closest match': 'bg-emerald-100 text-emerald-800',
  'Partial': 'bg-amber-100 text-amber-800',
  'Name-only': 'bg-slate-100 text-slate-700',
  'No equivalent': 'bg-rose-100 text-rose-800',
};

const COMPARE: Array<{ ours: string; sap: string; close: Close; note: string }> = [
  { ours: 'Charter Drafter · WBS Builder · Cost Planner', sap: 'Project Setup Agent (S/4HANA Cloud Public Edition)', close: 'Closest match', note: 'Same intent — speed up standing a project up with AI. SAP builds the project inside S/4 EPPM from templates; AI PMO authors a scope-true WBS, charter and cost plan and books it.' },
  { ours: 'Variance Analyst · Portfolio Risk Reviewer', sap: 'Project budget analytics + portfolio assistant (Joule for EPPM)', close: 'Partial', note: 'SAP surfaces schedule/cost variance and earned-value KPIs natively in S/4 and Joule summarises them — but only when cost and schedule both live inside S/4.' },
  { ours: 'Change Order Reviewer', sap: 'Change Record Management Agent', close: 'Name-only', note: 'SAP’s is engineering change records (supply chain / product) — not commercial change orders and their margin impact.' },
  { ours: 'Schedule Reasoner · Risk Analyst · Status Reporter · Stakeholder Analyst · Communications Planner · Issue Logger · Lessons-Learned Synthesiser · Closeout Reporter', sap: '— no SAP agent —', close: 'No equivalent', note: 'PMBOK process-area agents that are not core S/4 transactions, so SAP does not ship them.' },
];

const DISTINCT = [
  'Cross-system earned value — joining SAP PS cost with an external scheduler’s progress (the metric no single system owns)',
  'Schedule Reasoner — critical path, float and forecast-vs-contractual-window reasoning over a scheduler SAP can’t see',
  'Project risk register + cross-project portfolio patterns',
  'Audience-tailored RAG status brief (Status Reporter)',
  'PMBOK process agents: stakeholder, communications, issues, lessons learned, closeout',
];
const SAP_HAS = [
  'Finance — Cash Management, Dispute Resolution, AR/collections, billing/rebates',
  'Procurement — Bid Analysis, Tender Analysis, Supplier Onboarding, SOW creation',
  'Supply chain — Production Planning & Operations, Change Record Management',
  'HR (SuccessFactors) — People Intelligence, Career & Talent Development',
  'Travel & expense (Concur) — Receipt Analysis; industry agents (Utilities, Trade Classification)',
];
const SOURCES = [
  { label: 'SAP News — New Joule Agents (SAP Connect 2025)', url: 'https://news.sap.com/2025/10/sap-connect-business-ai-new-joule-agents-embedded-intelligence/' },
  { label: 'SAP News — Business AI Release Highlights Q1 2026', url: 'https://news.sap.com/2026/04/sap-business-ai-release-highlights-q1-2026/' },
  { label: 'SAP News — Sapphire 2026, the Autonomous Enterprise', url: 'https://news.sap.com/2026/05/sap-sapphire-sap-unveils-autonomous-enterprise/' },
  { label: 'sap.com — Joule Agents use cases by business function', url: 'https://www.sap.com/products/artificial-intelligence/ai-agents/agent-use-cases.html' },
  { label: 'SAP Community — Enterprise Portfolio & Project Management in S/4HANA Cloud 2025', url: 'https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/enterprise-portfolio-and-project-management-in-sap-s-4hana-cloud-private/ba-p/14349843' },
  { label: 'AIMultiple — SAP AI Agents in 2026', url: 'https://aimultiple.com/sap-ai-agents' },
];

export default async function ComparisonPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('technical', resolved))) redirect('/dashboard');

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/dashboard`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/technical`} className="hover:underline">Technical notes</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">vs SAP</span>
      </nav>

            <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">AI PMO vs SAP&apos;s AI agents</h1>
        <PrintButton />
      </div>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        SAP is investing heavily in agentic AI — Joule Agents (30+ shipped, 200+ specialised planned), plus Joule Studio
        to build your own. Almost none overlap with AI PMO, because the two are built for opposite positions: SAP&apos;s
        agents are <span className="font-medium text-foreground">embedded inside S/4HANA</span> and automate transactions
        within one system; AI PMO is a <span className="font-medium text-foreground">synthesis layer</span> that reads
        across SAP PS and a separate scheduler. The agent-by-agent picture, as of June 2026:
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">AI PMO agent(s)</th>
              <th className="px-3 py-2 font-semibold">SAP&apos;s closest</th>
              <th className="px-3 py-2 font-semibold">How close</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {COMPARE.map((r) => (
              <tr key={r.ours} className="align-top">
                <td className="px-3 py-3 font-medium text-foreground">{r.ours}</td>
                <td className="px-3 py-3"><div className="text-foreground/80">{r.sap}</div><div className="mt-1 text-[13px] text-muted-foreground">{r.note}</div></td>
                <td className="px-3 py-3"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CLOSE_CLS[r.close]}`}>{r.close}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Distinctively AI PMO — no SAP equivalent</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-foreground/85">{DISTINCT.map((d) => <li key={d} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />{d}</li>)}</ul>
        </div>
        <div className="rounded-xl border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SAP ships, AI PMO deliberately doesn&apos;t</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">{SAP_HAS.map((d) => <li key={d} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-muted-foreground/40" />{d}</li>)}</ul>
        </div>
      </div>

      <div className="mt-5 rounded-xl border-l-4 border-sky-400 bg-sky-50/50 px-4 py-3">
        <p className="text-sm font-semibold text-sky-800">The architectural difference (why there is so little overlap)</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">
          SAP&apos;s agents live inside one system of record and act on its data. An agent embedded in S/4 cannot compute
          earned value when the schedule lives in Primavera P6 or MS Project — it cannot see outside SAP. AI PMO sits above
          both and joins them on the WBS code, which is structurally the thing an embedded agent can&apos;t do. The flip
          side: SAP now ships <span className="font-medium">Joule Studio</span>, so a customer could build PMO-style agents
          on SAP&apos;s platform — SAP just doesn&apos;t deliver this project-controls synthesis suite out of the box.
        </p>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        On Microsoft: the PM agent (the &ldquo;Planner agent&rdquo;) lives in Microsoft Planner — lightweight, one tool; the heavyweight
        schedulers (Microsoft Project / Project Online) have no agent. Same embedded limitation as SAP, so there is no
        separate &ldquo;vs Microsoft Project&rdquo; comparison — it is a scheduler AI PMO consumes from, not a competitor.
      </p>

      <div className="mt-5 rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources (captured June 2026)</p>
        <ul className="mt-2 space-y-1 text-[13px]">{SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900">{s.label}</a></li>)}</ul>
      </div>

      <div className="mt-8"><Link href={`/technical`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Technical notes</Link></div>
    </div>
  );
}
