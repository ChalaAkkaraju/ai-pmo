/**
 * Shared TypeScript types for the PMO LLM Demo.
 * Mirrors the Supabase schema in supabase/migrations/0001_init.sql.
 */

export type RoleType =
  | 'pm'
  | 'procurement'
  | 'risk'
  | 'sponsor'
  | 'commercial'
  | 'project_controls'
  | 'program_manager'
  | 'engineering_manager'
  | 'construction_manager'
  | 'hse_manager';

export interface Role {
  id: string;
  token: string;
  name: string;
  role_type: RoleType;
  allowed_agents: AgentType[];
  created_at: string;
}

export type ProjectStatus = 'Active' | 'SC' | 'Closed';
export type Segment = 'renewables' | 'water' | 'industrial' | 'power';

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  contract_value_initial: number;
  contract_value_current: number;
  approved_budget_initial: number;
  approved_budget_current: number;
  contingency: number;
  segment: Segment;
  status: ProjectStatus;
  current_week: number;
  hard_deadline_description: string | null;
  created_at: string;
}

export type IssueSeverity = 'L' | 'M' | 'H';
export type IssueStatus = 'Open' | 'In progress' | 'Resolved' | 'Closed';

export interface Issue {
  id: string;
  project_id: string;
  issue_id: string;
  description: string;
  category: string;
  severity: IssueSeverity;
  owner: string;
  status: IssueStatus;
  linked_wbs: string[];
  linked_risk: string | null;
  opened_week: number;
  closed_week: number | null;
  closure_narrative: string | null;
  created_at: string;
  updated_at: string;
}

export type RiskClosureStatus =
  | 'Active'
  | 'Active — mitigated to date'
  | 'Active — partially realised'
  | 'Mitigated'
  | 'Realised'
  | 'Not Materialised';

export type CrossCuttingClass =
  | 'Vendor / supplier concentration'
  | 'Regulatory / external deadline'
  | 'Site-conditions variance'
  | 'Resource / labour scarcity'
  | 'Client-driven scope or sequence changes'
  | 'Weather / climate-sensitive construction'
  | 'Project-specific';

export interface Risk {
  id: string;
  project_id: string;
  risk_id: string;
  category: string;
  description: string;
  probability: 'L' | 'M' | 'H';
  impact: 'L' | 'M' | 'H';
  score: number;
  response: string;
  owner: string;
  trigger: string;
  status: RiskClosureStatus;
  cross_cutting_class: CrossCuttingClass;
  pattern_link: string | null;
  created_at: string;
  updated_at: string;
}

export type CODriver = 'Client-driven' | 'Northwood-driven' | 'External regulatory' | 'Scope clarification';
export type COStatus = 'Anticipated' | 'Under analysis' | 'Priced' | 'Executed' | 'Complete' | 'Rejected';

export interface ChangeOrder {
  id: string;
  project_id: string;
  co_id: string;
  driver: CODriver;
  scope_summary: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  schedule_impact_days: number;
  margin_realized_pct: number;
  status: COStatus;
  approval_routing: string;
  executed_week: number | null;
  four_frame_analysis: {
    vendor_leverage: string;
    client_leverage: string;
    client_position: string;
    northwood_acceptance: string;
  } | null;
  created_at: string;
}

export interface VarianceReport {
  id: string;
  project_id: string;
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
  projected_margin_pct: number;
  buffer_intact_days: number;
  full_report_md: string;
  created_at: string;
}

export type AgentType =
  | 'charter_drafter'
  | 'stakeholder_analyst'
  | 'wbs_builder'
  | 'schedule_reasoner'
  | 'budget_builder'
  | 'communications_planner'
  | 'issue_logger'
  | 'variance_analyst'
  | 'change_order_reviewer'
  | 'risk_analyst'
  | 'lessons_learned_synthesiser'
  | 'closeout_reporter'
  | 'portfolio_risk_reviewer';

export interface AgentOutput {
  id: string;
  project_id: string | null;
  agent_type: AgentType;
  invoked_by_role_id: string;
  invoked_at: string;
  user_prompt: string;
  input_payload: Record<string, unknown>;
  output_md: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export type ActionStatus = 'Open' | 'Acknowledged' | 'In progress' | 'Done';
export type ActionUrgency = 'L' | 'M' | 'H';
export type ActionSourceType = 'risk' | 'issue';

/**
 * A cross-agent task: a mitigation action raised by one role's agent and
 * assigned to another role to own. Mirrors action_items (migration 0009).
 */
export interface ActionItem {
  id: string;
  project_id: string | null;
  source_type: ActionSourceType;
  source_id: string | null;
  source_ref: string | null;
  description: string;
  assigned_to_role_type: RoleType;
  raised_by_role_type: RoleType | null;
  raised_by_agent_type: AgentType | null;
  status: ActionStatus;
  urgency: ActionUrgency;
  due_week: number | null;
  created_from_output_id: string | null;
  assignment_flagged: boolean;
  response_md: string | null;
  responded_by_role_type: RoleType | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PatternStatus = 'candidate' | 'confirmed' | 'firm-level standard';

export interface PortfolioPattern {
  id: string;
  pattern_id: string;
  name: string;
  cross_cutting_class: CrossCuttingClass;
  status: PatternStatus;
  evidence_md: string;
  threshold_projects: number;
  supporting_projects: string[];
  recommended_action: string;
  created_at: string;
  updated_at: string;
}
