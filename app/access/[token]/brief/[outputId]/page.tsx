/**
 * Brief viewer page.
 *
 * Renders the QUICK BRIEF (output_md, ~250 words) of a single agent_output as
 * a clean, printable, sharable page. Loads instantly — no long-form regen.
 *
 * Opens from:
 *   - "↗ Pop out brief" link in the floating agent widget
 *
 * URL: /access/[token]/brief/[outputId]
 *
 * Use case: a colleague wants to keep a brief response visible (in its own
 * tab/window) while continuing to ask follow-up questions in the widget on
 * the dashboard. Compare against /access/[token]/report/[outputId] which
 * renders the long-form polished report with PDF download.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { BriefView } from '@/components/brief-view';

export const dynamic = 'force-dynamic';

const AGENT_LABELS: Record<string, string> = {
  charter_drafter: 'Charter Drafter',
  stakeholder_analyst: 'Stakeholder Analyst',
  wbs_builder: 'WBS Builder',
  schedule_reasoner: 'Schedule Reasoner',
  budget_builder: 'Budget Builder',
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
  params: Promise<{ token: string; outputId: string }>;
}

export default async function BriefPage({ params }: PageProps) {
  const { token, outputId } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('agent_outputs')
    .select(
      'id, agent_type, invoked_at, user_prompt, output_md, ' +
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
    projects: JoinedProject | JoinedProject[] | null;
    roles: JoinedRole | JoinedRole[] | null;
  };

  const project = Array.isArray(raw.projects) ? raw.projects[0] ?? null : raw.projects;
  const role = Array.isArray(raw.roles) ? raw.roles[0] ?? null : raw.roles;

  const agentLabel = AGENT_LABELS[raw.agent_type] ?? raw.agent_type;

  return (
    <BriefView
      token={token}
      output={{
        id: raw.id,
        agent_type: raw.agent_type,
        agent_label: agentLabel,
        invoked_at: raw.invoked_at,
        user_prompt: raw.user_prompt,
        output_md: raw.output_md,
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
      colleague={role ? { name: role.name, role_type: role.role_type } : null}
      viewerRole={resolved.definition.display_name}
    />
  );
}
