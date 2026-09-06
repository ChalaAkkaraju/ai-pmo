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
  | 'hse_manager'
  | 'admin'
  | 'it_portfolio_manager'
  | 'it_pm'
  | 'it_sponsor'
  | 'it_bucket_owner'
  | 'it_board_member'
  | 'it_finance'
  | 'portfolio_executive';

/**
 * Project population (migration 0045). Revenue = customer-facing EPC projects
 * (the original product); it / capital / rnd are the PMOs added on the shared
 * canonical model. Workspaces differ per type; storage does not.
 */
export type ProjectType = 'revenue' | 'it' | 'capital' | 'rnd';
export const ALL_PROJECT_TYPES: ProjectType[] = ['revenue', 'it', 'capital', 'rnd'];

/** One level below project_type. IT categories pick the stage template. */
export type ItCategory = 'design_development' | 'deployment' | 'maintenance_upgrade';

/** Portfolio lifecycle, distinct from delivery `status`. */
export type LifecycleStatus = 'proposed' | 'approved' | 'deferred' | 'active' | 'on_hold' | 'cancelled' | 'closed';

/** What kind of value a non-revenue business case claims. */
export type ValueType = 'hard_savings' | 'soft_benefit' | 'risk_reduction' | 'enablement' | 'compliance';

export interface BusinessCase {
  value_type: ValueType;
  benefit_summary: string;
  annual_benefit?: number | null;
  roi_pct?: number | null;
  payback_months?: number | null;
  strategic_score?: number | null; // 0-100
  benefits_owner?: string | null;
  capex_share_pct?: number | null; // share of requested budget expected to capitalise
  is_mandatory?: boolean;
}

export interface Role {
  id: string;
  token: string | null;
  name: string;
  username: string | null;
  role_type: RoleType;
  allowed_agents: AgentType[];
  user_id: string | null;
  /** Workspaces this role may see (migration 0045); null = role-type default. */
  project_types: ProjectType[] | null;
  is_admin: boolean;
  disabled: boolean;
  must_change_password: boolean;
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
  /** Delivery context for revenue projects; null for other project types. */
  segment: Segment | null;
  status: ProjectStatus;
  current_week: number;
  hard_deadline_description: string | null;
  created_at: string;
  // ---- shared-model columns (migration 0045); defaults keep revenue unchanged
  project_type: ProjectType;
  project_category: string | null;
  portfolio_bucket: string | null;
  fiscal_year: number | null;
  fiscal_years_approved: number[];
  lifecycle_status: LifecycleStatus;
  stage_template_id: string | null;
  current_stage: number | null;
  continuation_of_id: string | null;
  business_case: BusinessCase | null;
  requested_budget: number | null;
}

/** One stage in a stage template (stage_templates.stages[]). */
export interface StageDef {
  seq: number;
  key: string;
  name: string;
  gate_name: string;
  /** The commit gate: scope, budget and accounting treatment lock here. */
  is_commit: boolean;
  exit_criteria: string[];
  attendees: string[];
}

export interface StageTemplate {
  id: string;
  project_type: ProjectType;
  category: string;
  name: string;
  description: string | null;
  stages: StageDef[];
  created_at: string;
}

export type GateDecisionOutcome = 'go' | 'hold' | 'kill' | 'recycle' | 'defer' | 'resume';

export interface GateDecision {
  id: string;
  project_id: string;
  stage_seq: number;
  gate_name: string;
  decision: GateDecisionOutcome;
  decided_on: string;
  decided_by: string | null;
  decided_by_role_type: RoleType | null;
  criteria_scores: { must_meet?: Array<{ criterion: string; met: boolean }>; should_meet?: Array<{ criterion: string; score: number }> } | null;
  case_snapshot: Partial<BusinessCase> & { budget?: number } | null;
  notes: string | null;
  source_system: string;
  external_id: string | null;
  created_by_output_id: string | null;
  decision_record_id?: string | null;
  hold_until?: string | null;
  created_at: string;
}

export interface PortfolioAllocation {
  id: string;
  project_type: ProjectType;
  fiscal_year: number;
  bucket: string;
  allocated_amount: number;
  reserve_amount: number;
  is_mandatory_lane: boolean;
  priority: number | null;
  notes: string | null;
  status?: 'draft' | 'proposed' | 'approved';
  decision_record_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type SanctionKind =
  | 'contract_value'
  | 'waterline_envelope'
  | 'sg1_baseline'
  | 'continuation'
  | 'afe'
  | 'supplementary_afe'
  | 'gate_budget';

/** A dated, versioned record of what was authorised (the unifying abstraction). */
export interface SanctionEvent {
  id: string;
  project_id: string;
  kind: SanctionKind;
  version: number;
  amount: number;
  fiscal_year: number | null;
  authorised_by: string | null;
  authorised_on: string | null;
  document_ref: string | null;
  notes: string | null;
  source_system: string;
  external_id: string | null;
  decision_record_id?: string | null;
  authorised_by_body?: string | null;
  created_at: string;
}

export type FundingSource = 'customer' | 'project_contingency' | 'bucket_reserve' | 'displacement' | 'supplementary_afe';

// ---- governance (migration 0046) -------------------------------------------

export type DecisionKind =
  | 'envelope_allocation'
  | 'waterline_approval'
  | 'continuation'
  | 'commit_baseline'
  | 'change_order'
  | 'reserve_draw'
  | 'hold'
  | 'cancel';

export interface DecisionBody {
  id: string;
  project_type: ProjectType;
  /** investment_board | cio | bucket_owner:<bucket> | sponsor | finance | architecture */
  key: string;
  name: string;
  description: string | null;
  quorum: number;
  member_role_type: RoleType | null;
  created_at: string;
}

export interface DecisionBodyMember {
  id: string;
  body_id: string;
  role_id: string;
  is_chair: boolean;
  is_voting: boolean;
  created_at: string;
}

export interface AuthorityRule {
  id: string;
  project_type: ProjectType;
  decision_kind: DecisionKind;
  funding_source: FundingSource | null;
  post_commit: boolean | null;
  min_amount: number;
  max_amount: number | null;
  required_body_key: string;
  required_concurrences: string[];
  notes: string | null;
  created_at: string;
}

export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'returned' | 'withdrawn';

export interface Concurrence {
  body_key: string;
  outcome: 'concur' | 'object';
  by_name: string;
  by_role_id: string | null;
  at: string;
  notes?: string | null;
}

/** A funding / governance decision: proposed by the PMO, decided by the authorised body. */
export interface DecisionRecord {
  id: string;
  project_type: ProjectType;
  decision_kind: DecisionKind;
  project_id: string | null;
  fiscal_year: number | null;
  amount: number | null;
  title: string;
  proposal: Record<string, unknown>;
  proposed_by_role_id: string | null;
  proposed_by_name: string | null;
  proposed_at: string;
  required_body_key: string;
  required_concurrences: string[];
  concurrences: Concurrence[];
  status: DecisionStatus;
  decided_body_key: string | null;
  decided_by_role_id: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  attendees: string[];
  conditions: string | null;
  minutes: string | null;
  resulting_sanction_event_id: string | null;
  resulting_gate_decision_id: string | null;
  created_at: string;
}

export type DisplacementReason = 'incident_run' | 'higher_priority_project' | 'audit_compliance' | 'revenue_priority' | 'revenue_ld_exposure' | 'incident' | 'other';

/** A shared person moved from one project type's work to another's — recorded, not absorbed. */
export interface ResourceDisplacement {
  id: string;
  from_project_id: string;
  to_project_id: string | null;
  to_project_code: string | null;
  resource_name: string;
  skill: string | null;
  from_date: string;
  to_date: string | null;
  fte: number;
  schedule_impact_days: number | null;
  reason: DisplacementReason;
  notes: string | null;
  logged_by_role_id: string | null;
  logged_by_name: string | null;
  created_at: string;
}

export interface BenefitsReport {
  id: string;
  project_id: string;
  period: string;
  planned_benefit: number;
  realised_benefit: number;
  commentary: string | null;
  reported_by: string | null;
  reported_at: string;
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
export type COStatus = 'Identified' | 'Quantified' | 'Submitted to client' | 'In negotiation' | 'Approved' | 'Absorbed' | 'Withdrawn';

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
  source_issue_id?: string | null;
  source_risk_id?: string | null;
  /** Where the money comes from (null on legacy revenue rows = customer). */
  funding_source?: FundingSource | null;
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
  | 'portfolio_risk_reviewer'
  | 'status_reporter'
  | 'cost_controller'
  // IT / portfolio agents (migration 0045)
  | 'business_case_reviewer'
  | 'waterline_ranker'
  | 'gate_reviewer'
  | 'continuation_reviewer'
  | 'executive_briefing_writer'
  | 'governance_health_reviewer';

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
  assigned_to_user_id: string | null;
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
