/**
 * Polished status-report viewer.
 *
 * Renders a single agent_output as a printable, sharable report — the kind of
 * thing a PMO would email to a sponsor. Opens in a new tab from:
 *   - Activity feed cards on the dashboard
 *   - "Open as report" in the floating agent widget
 *   - "Open as report" on every planning artefact tab (Charter / WBS / etc.)
 *
 * URL: /access/[token]/report/[outputId]
 *
 * Two-tier layout:
 *   - Summary block (everything before the first H2) — always visible
 *   - Full detail (from first H2 onward) — collapsible, expanded by default
 *
 * Includes a Download PDF button that uses the browser's native
 * print-to-PDF (window.print) so the user gets a real PDF with one click
 * and no server roundtrip.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ReportView } from '@/components/report-view';

export const dynamic = 'force-dynamic';

const AGENT_LABELS: Record<string, string> = {
  charter_drafter: 'Charter Drafter',
  stakeholder_analyst: 'Stakeholder Analyst',
  wbs_builder: 'WBS Builder',
  schedule_reasoner: 'Schedule Reasoner',
  budget_builder: 'Cost Planner',
  communications_planner: 'Communications Planner',
  issue_logger: 'Issue Logger',
  variance_analyst: 'Variance Analyst',
  change_order_reviewer: 'Change Order Reviewer',
  risk_analyst: 'Risk Analyst',
  lessons_learned_synthesiser: 'Lessons-Learned Synthesiser',
  closeout_reporter: 'Closeout Reporter',
  portfolio_risk_reviewer: 'Portfolio Risk Reviewer',
};

interface PageProps {
  params: Promise<{ outputId: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { outputId } = await params;
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('agent_outputs')
    .select(
      'id, agent_type, invoked_at, user_prompt, output_md, full_output_md, tokens_used, ' +
        'projects:project_id(code, name, segment, client, status), ' +
        'roles:invoked_by_role_id(name, role_type)',
    )
    .eq('id', outputId)
    .maybeSingle();

  if (error || !data) notFound();

  type JoinedProject = {
    code: string;
    name: string;
    segment: string;
    client: string;
    status: string;
  };
  type JoinedRole = { name: string; role_type: string };

  const raw = data as unknown as {
    id: string;
    agent_type: string;
    invoked_at: string;
    user_prompt: string | null;
    output_md: string;
    full_output_md: string | null;
    tokens_used: number | null;
    projects: JoinedProject | JoinedProject[] | null;
    roles: JoinedRole | JoinedRole[] | null;
  };

  const project = Array.isArray(raw.projects) ? raw.projects[0] ?? null : raw.projects;
  const role = Array.isArray(raw.roles) ? raw.roles[0] ?? null : raw.roles;

  const agentLabel = AGENT_LABELS[raw.agent_type] ?? raw.agent_type;

  return (
    <ReportView
      token={token}
      output={{
        id: raw.id,
        agent_type: raw.agent_type,
        agent_label: agentLabel,
        invoked_at: raw.invoked_at,
        user_prompt: raw.user_prompt,
        output_md: raw.output_md,
        full_output_md: raw.full_output_md,
      }}
      project={
        project
          ? {
              code: project.code,
              name: project.name,
              segment: project.segment,
              client: project.client,
              status: project.status,
            }
          : null
      }
      colleague={
        role
          ? { name: role.name, role_type: role.role_type }
          : null
      }
      viewerRole={resolved.definition.display_name}
    />
  );
}
