/**
 * Role definitions for the PMO LLM Demo.
 * Each colleague holds a portfolio-level role spanning all 4 projects.
 */

import type { AgentType, RoleType } from './types';

export interface RoleDefinition {
  type: RoleType;
  display_name: string;
  description: string;
  allowed_agents: AgentType[];
  /**
   * What this role sees on the dashboard. Used to slice the project state
   * server-side when rendering the role landing page.
   */
  dashboard_sections: DashboardSection[];
  /** Can write (invoke agents that mutate state) vs read-only. */
  can_write: boolean;
}

export type DashboardSection =
  | 'projects_overview'
  | 'issues'
  | 'risks'
  | 'change_orders'
  | 'variance_reports'
  | 'closeout_reports'
  | 'portfolio_patterns'
  | 'lessons_learned';

export const ROLE_DEFINITIONS: Record<RoleType, RoleDefinition> = {
  pm: {
    type: 'pm',
    display_name: 'Senior PM (PMO Director)',
    description:
      'Portfolio-level PM. Sees the full ~100-project portfolio across renewables, water, industrial, and power, plus every artefact category. Can invoke any of the 13 agents.',
    allowed_agents: [
      'charter_drafter',
      'stakeholder_analyst',
      'wbs_builder',
      'schedule_reasoner',
      'budget_builder',
      'communications_planner',
      'issue_logger',
      'variance_analyst',
      'change_order_reviewer',
      'risk_analyst',
      'lessons_learned_synthesiser',
      'closeout_reporter',
      'portfolio_risk_reviewer',
    ],
    dashboard_sections: [
      'projects_overview',
      'issues',
      'risks',
      'change_orders',
      'variance_reports',
      'closeout_reports',
      'portfolio_patterns',
      'lessons_learned',
    ],
    can_write: true,
  },
  procurement: {
    type: 'procurement',
    display_name: 'Portfolio Procurement Strategist',
    description:
      'Procurement-side slice across the portfolio. Owns vendor risks (Pattern 1 anchor), change orders involving procurement scope, and procurement-driven variance commentary.',
    allowed_agents: ['risk_analyst', 'variance_analyst', 'change_order_reviewer', 'portfolio_risk_reviewer'],
    dashboard_sections: ['projects_overview', 'risks', 'change_orders', 'variance_reports'],
    can_write: true,
  },
  risk: {
    type: 'risk',
    display_name: 'Portfolio Risk Analyst',
    description:
      'Risks across the full portfolio plus cross-cutting patterns. Owns the risk register and portfolio pattern emergence analysis.',
    allowed_agents: ['risk_analyst', 'portfolio_risk_reviewer', 'lessons_learned_synthesiser', 'issue_logger'],
    dashboard_sections: ['projects_overview', 'risks', 'issues', 'portfolio_patterns', 'lessons_learned'],
    can_write: true,
  },
  sponsor: {
    type: 'sponsor',
    display_name: 'VP Sponsor',
    description:
      'Executive view across the full portfolio. Reads status, variance summaries, change orders requiring sponsor sign-off, portfolio patterns. Read-only on most state.',
    allowed_agents: ['closeout_reporter', 'portfolio_risk_reviewer'],
    dashboard_sections: [
      'projects_overview',
      'variance_reports',
      'change_orders',
      'closeout_reports',
      'portfolio_patterns',
    ],
    can_write: false,
  },
  commercial: {
    type: 'commercial',
    display_name: 'Commercial Manager',
    description:
      'Commercial-side slice. Owns four-frame commercial dynamics on change orders, contractual terms, margin protection. (Optional 5th role — staged but not seeded by default.)',
    allowed_agents: ['change_order_reviewer', 'variance_analyst'],
    dashboard_sections: ['projects_overview', 'change_orders', 'variance_reports'],
    can_write: true,
  },
};

export function getRoleDefinition(roleType: RoleType): RoleDefinition {
  return ROLE_DEFINITIONS[roleType];
}

export function canRoleInvokeAgent(roleType: RoleType, agentType: AgentType): boolean {
  return ROLE_DEFINITIONS[roleType].allowed_agents.includes(agentType);
}
