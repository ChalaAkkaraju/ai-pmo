/**
 * The workspace story told on the sign-in and welcome screens — one entry per
 * PMO: the question it answers, what you see there, what it is measured on.
 * Shared so the two screens never say different things.
 */

export type WorkspaceKey = 'enterprise' | 'revenue' | 'it' | 'rnd' | 'capital';

export interface WorkspaceStory {
  key: WorkspaceKey;
  title: string;
  question: string;
  highlights: string[];
  measures: string[];
  href: string;
}

export const WORKSPACES: WorkspaceStory[] = [
  { key: 'enterprise', title: 'Enterprise', question: 'What needs a decision this week — across every PMO?',
    highlights: ['One attention list for all four PMOs', 'Who decides what, and how fast they do it', 'The board pack, drafted by the executive agent'],
    measures: ['Decisions open', 'Governance health', 'Ratios'], href: '/portfolio/enterprise' },
  { key: 'revenue', title: 'Revenue', question: 'Will we deliver each contract at the margin we sold?',
    highlights: ['ERP cost and scheduler progress joined into earned value', 'Margin bridge from sold to forecast', 'Risks, issues and changes on every project'],
    measures: ['Earned value', 'CPI / SPI', 'Margin'], href: '/dashboard' },
  { key: 'it', title: 'IT', question: 'Which projects get funded this year — and do they deliver?',
    highlights: ['Bucket envelopes ranked to a waterline', 'Scope, budget and capex split locked at Stage Gate 1', 'Benefits realised against the case'],
    measures: ['Waterline', 'Gate status', 'Benefits'], href: '/portfolio/it' },
  { key: 'rnd', title: 'R&D / NPI', question: 'Does the business case we funded still hold?',
    highlights: ['Money released gate by gate, not all at once', 'Case drift checked between gates, not at them', 'Kills graded — early and cheap is a win'],
    measures: ['Expected value', 'Cycle time', 'Kill quality'], href: '/portfolio/rnd' },
  { key: 'capital', title: 'Capital', question: 'Will this spend become an asset on the register — on time?',
    highlights: ['Front-end loading to the AFE at FEL3', 'Forecast vs AFE, with the supplementary trigger', 'Settlement readiness before in-service'],
    measures: ['AFE vs forecast', 'Asset chain', 'Settlement'], href: '/portfolio/capital' },
];

/** Colour and icon name per workspace — matches the header, enterprise view and role menu. */
export const WORKSPACE_HEX: Record<WorkspaceKey, { hex: string; soft: string }> = {
  enterprise: { hex: '#0f172a', soft: '#f1f5f9' },
  revenue: { hex: '#2563eb', soft: '#eff6ff' },
  it: { hex: '#0d9488', soft: '#f0fdfa' },
  rnd: { hex: '#7c3aed', soft: '#f5f3ff' },
  capital: { hex: '#d97706', soft: '#fffbeb' },
};

export const PITCH = {
  eyebrow: 'AI PMO · one intelligence layer for every PMO',
  lead: 'Cost sits in the ERP. Schedule sits in the scheduler. The business case sits in a spreadsheet —',
  turn: 'and they have never agreed.',
  close: 'AI PMO joins them across Revenue, IT, R&D and Capital, explains what moved and why, and puts every decision in front of the person who owns it.',
  outcomes: ['No re-keying', 'No month-end reconciliation', 'Decisions, not reports'],
};
