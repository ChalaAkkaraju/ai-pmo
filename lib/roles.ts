/**
 * Role definitions for the PMO LLM Demo.
 * Each colleague holds a portfolio-level role spanning all 4 projects.
 */

import type { AgentType, ProjectType, RoleType } from './types';

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
      'Portfolio-level PM. Sees the full ~100-project portfolio across renewables, water, industrial, and power, plus every artefact category. Can invoke any of the 15 agents.',
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
      'status_reporter',
      'cost_controller',
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
      'Commercial-side slice. Owns four-frame commercial dynamics on change orders, contractual terms, margin protection.',
    allowed_agents: ['change_order_reviewer', 'variance_analyst', 'cost_controller'],
    dashboard_sections: ['projects_overview', 'change_orders', 'variance_reports'],
    can_write: true,
  },
  project_controls: {
    type: 'project_controls',
    display_name: 'Project Controls Manager',
    description:
      'Cost and schedule analytics across the portfolio. Owns earned-value health (CPI/SPI), schedule baseline reasoning, and budget structure for new work.',
    allowed_agents: ['variance_analyst', 'schedule_reasoner', 'budget_builder', 'cost_controller'],
    dashboard_sections: ['projects_overview', 'variance_reports'],
    can_write: true,
  },
  program_manager: {
    type: 'program_manager',
    display_name: 'Program Manager — Renewables',
    description:
      'Multi-project oversight for a programme of related projects (e.g., the renewables programme). Tracks execution health, escalations, and portfolio patterns relevant to the programme. Hands off deep planning (Charter, WBS) to engineering.',
    allowed_agents: [
      'stakeholder_analyst',
      'schedule_reasoner',
      'budget_builder',
      'communications_planner',
      'issue_logger',
      'variance_analyst',
      'change_order_reviewer',
      'risk_analyst',
      'portfolio_risk_reviewer',
      'closeout_reporter',
      'status_reporter',
      'cost_controller',
    ],
    dashboard_sections: [
      'projects_overview',
      'issues',
      'risks',
      'change_orders',
      'variance_reports',
      'closeout_reports',
      'portfolio_patterns',
    ],
    can_write: true,
  },
  engineering_manager: {
    type: 'engineering_manager',
    display_name: 'Engineering Manager',
    description:
      'Technical leadership across projects. Drives early-phase planning artefacts (Charter, Stakeholder Analysis, WBS) and engineering-driven risk identification.',
    allowed_agents: ['charter_drafter', 'stakeholder_analyst', 'wbs_builder', 'risk_analyst'],
    dashboard_sections: ['projects_overview', 'risks'],
    can_write: true,
  },
  construction_manager: {
    type: 'construction_manager',
    display_name: 'Construction Manager',
    description:
      'Execution-phase site leadership. Logs construction issues, tracks weekly variance impacts on schedule, and reviews change orders affecting field execution.',
    allowed_agents: ['issue_logger', 'variance_analyst', 'change_order_reviewer'],
    dashboard_sections: ['projects_overview', 'issues', 'change_orders', 'variance_reports'],
    can_write: true,
  },
  hse_manager: {
    type: 'hse_manager',
    display_name: 'HSE Manager',
    description:
      'Health, safety, and environment oversight across the portfolio. Logs safety incidents and watches for cross-cutting HSE patterns (vendor, site-conditions, weather classes).',
    allowed_agents: ['issue_logger', 'portfolio_risk_reviewer'],
    dashboard_sections: ['projects_overview', 'issues', 'portfolio_patterns'],
    can_write: true,
  },
  it_portfolio_manager: {
    type: 'it_portfolio_manager',
    display_name: 'IT Portfolio Manager',
    description:
      'Runs the IT PMO annual cycle: bucket allocations and reserve, business-case review, within-bucket ranking against the waterline, yearly continuation decisions, and hold / cancel calls. Sees IT projects only.',
    allowed_agents: [
      'business_case_reviewer',
      'waterline_ranker',
      'gate_reviewer',
      'continuation_reviewer',
      'change_order_reviewer',
      'portfolio_risk_reviewer',
      'status_reporter',
      'risk_analyst',
      'issue_logger',
    ],
    dashboard_sections: ['projects_overview', 'risks', 'issues', 'change_orders', 'portfolio_patterns'],
    can_write: true,
  },
  it_pm: {
    type: 'it_pm',
    display_name: 'IT Project Manager',
    description:
      'Delivers IT projects through their stage gates: prepares the commit package for Stage Gate 1, runs the project to the locked baseline, raises change orders, and closes with AuC settled. Sees IT projects only.',
    allowed_agents: [
      'charter_drafter',
      'stakeholder_analyst',
      'wbs_builder',
      'schedule_reasoner',
      'budget_builder',
      'communications_planner',
      'issue_logger',
      'risk_analyst',
      'gate_reviewer',
      'change_order_reviewer',
      'status_reporter',
      'lessons_learned_synthesiser',
      'closeout_reporter',
    ],
    dashboard_sections: ['projects_overview', 'issues', 'risks', 'change_orders', 'lessons_learned'],
    can_write: true,
  },
  it_sponsor: {
    type: 'it_sponsor',
    display_name: 'IT Project Sponsor',
    description:
      'The business executive who owns the benefit of an IT project. Owns the business case, decides inside the locked baseline (changes within contingency, hold requests) and chairs the later gates. Cannot approve their own funding.',
    allowed_agents: ['business_case_reviewer', 'gate_reviewer', 'change_order_reviewer', 'status_reporter', 'risk_analyst', 'issue_logger'],
    dashboard_sections: ['projects_overview', 'risks', 'issues', 'change_orders'],
    can_write: true,
  },
  it_bucket_owner: {
    type: 'it_bucket_owner',
    display_name: 'IT Bucket Owner',
    description:
      'Accountable for a business-technology bucket (infrastructure, applications, security, compliance): ranks within it, recommends to the board, and approves within delegated authority — small envelopes, commit baselines and reserve draws up to the matrix limits.',
    allowed_agents: ['waterline_ranker', 'business_case_reviewer', 'continuation_reviewer', 'gate_reviewer', 'change_order_reviewer', 'risk_analyst', 'issue_logger', 'status_reporter'],
    dashboard_sections: ['projects_overview', 'risks', 'issues', 'change_orders'],
    can_write: true,
  },
  it_board_member: {
    type: 'it_board_member',
    display_name: 'IT Investment Board (CIO)',
    description:
      'Member of the IT investment board; the CIO chairs it and also holds the delegated mid-band authority. The board owns the envelope split, the waterline above the CIO threshold, continuations, post-commit cancellations and displacing change orders.',
    allowed_agents: ['waterline_ranker', 'business_case_reviewer', 'continuation_reviewer', 'gate_reviewer', 'portfolio_risk_reviewer', 'status_reporter'],
    dashboard_sections: ['projects_overview', 'change_orders', 'portfolio_patterns'],
    can_write: true,
  },
  it_finance: {
    type: 'it_finance',
    display_name: 'Finance Controller (IT)',
    description:
      'Concurrence, not approval: validates business-case numbers before ranking, and must concur on the capital / expense split before any commit-gate Go and on AuC settlement before a post-commit cancellation.',
    allowed_agents: ['business_case_reviewer', 'continuation_reviewer', 'gate_reviewer', 'cost_controller'],
    dashboard_sections: ['projects_overview', 'change_orders'],
    can_write: true,
  },
  portfolio_executive: {
    type: 'portfolio_executive',
    display_name: 'Portfolio Executive',
    description:
      'The CFO\'s office or head of portfolio. Reads across every project type through the Enterprise view — counts, states, dates, ratios and each PMO\'s money in its own terms — and asks the executive agents for the board pack and the health of the governance. Decides nothing and writes nothing in any workspace.',
    allowed_agents: ['executive_briefing_writer', 'governance_health_reviewer', 'portfolio_risk_reviewer', 'lessons_learned_synthesiser'],
    dashboard_sections: ['projects_overview'],
    can_write: false,
  },
  admin: {
    type: 'admin',
    display_name: 'Administrator',
    description:
      'User administration only. Creates colleague accounts, assigns roles, and enables/disables access. Not a PMO role — no project dashboard and no agents.',
    allowed_agents: [],
    dashboard_sections: [],
    can_write: false,
  },
};

export function getRoleDefinition(roleType: RoleType): RoleDefinition {
  return ROLE_DEFINITIONS[roleType];
}

export function canRoleInvokeAgent(roleType: RoleType, agentType: AgentType): boolean {
  return ROLE_DEFINITIONS[roleType].allowed_agents.includes(agentType);
}

/** All valid role types, derived from the definitions map. */
export const ROLE_TYPES = Object.keys(ROLE_DEFINITIONS) as RoleType[];

/** Type guard: is this string one of the known role types? */
export function isValidRoleType(value: string): value is RoleType {
  return (ROLE_TYPES as string[]).includes(value);
}

/**
 * Short, human-facing label for a role type (e.g. for action-assignment UI).
 * Falls back to the full display name from the definitions map.
 */
export const ROLE_SHORT_LABELS: Record<RoleType, string> = {
  pm: 'Senior PM',
  procurement: 'Procurement Strategist',
  risk: 'Risk Analyst',
  sponsor: 'VP Sponsor',
  commercial: 'Commercial Manager',
  project_controls: 'Project Controls',
  program_manager: 'Program Manager',
  engineering_manager: 'Engineering Manager',
  construction_manager: 'Construction Manager',
  hse_manager: 'HSE Manager',
  admin: 'Administrator',
  it_portfolio_manager: 'IT Portfolio Manager',
  it_pm: 'IT PM',
  it_sponsor: 'IT Sponsor',
  it_bucket_owner: 'IT Bucket Owner',
  it_board_member: 'IT Board / CIO',
  it_finance: 'Finance (IT)',
  portfolio_executive: 'Executive',
};

/**
 * Default workspace scope per role type, mirrored from migration 0045. The
 * live value lives on roles.project_types; this is the fallback when a row
 * predates the column (or for tests).
 */
export const DEFAULT_ROLE_PROJECT_TYPES: Record<RoleType, ProjectType[]> = {
  pm: ['revenue'],
  procurement: ['revenue'],
  risk: ['revenue'],
  sponsor: ['revenue'],
  commercial: ['revenue'],
  project_controls: ['revenue'],
  program_manager: ['revenue'],
  engineering_manager: ['revenue'],
  construction_manager: ['revenue'],
  hse_manager: ['revenue'],
  admin: ['revenue', 'it', 'capital', 'rnd'],
  it_portfolio_manager: ['it'],
  it_pm: ['it'],
  it_sponsor: ['it'],
  it_bucket_owner: ['it'],
  it_board_member: ['it'],
  it_finance: ['it'],
  portfolio_executive: ['revenue', 'it', 'capital', 'rnd'],
};

/** Roles that may create a project of the given type. */
export function canRoleCreateProjectType(roleType: RoleType, projectType: ProjectType): boolean {
  if (projectType === 'revenue') return roleType === 'pm' || roleType === 'engineering_manager';
  if (projectType === 'it') return roleType === 'it_portfolio_manager' || roleType === 'it_pm' || roleType === 'it_sponsor';
  return false;
}

export function roleLabel(roleType: RoleType): string {
  return ROLE_SHORT_LABELS[roleType] ?? ROLE_DEFINITIONS[roleType]?.display_name ?? roleType;
}
