// ─── API Types matching backend schemas exactly ──────────────────────────────

export type Decision = 'RESOLVE' | 'CLARIFY' | 'ABSTAIN' | 'ESCALATE';

export type FeedbackDecision = 'approved' | 'edited' | 'rejected';

export type ClaimStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';

export interface CustomerContext {
  intent?: string;
  product?: string;
  customer_segment?: string;
  region?: string;
  issue?: string;
  urgency?: string;
  account_state?: string;
  [key: string]: string | undefined;
}

export interface ClaimVerification {
  claim: string;
  status: ClaimStatus;
  evidence_ids: string[];
  entailment: number;
}

export interface Verification {
  claims: ClaimVerification[];
  groundedness: number;
  passed: boolean;
}

export interface EvidenceItem {
  id: string;
  title: string;
  content: string;
  source_type: string;
  score: number;
  metadata: {
    context_match?: number;
    authority?: number | string;
    freshness?: number;
    source_file?: string;
    page?: number;
    policy_key?: string;
    policy_value?: string;
    [key: string]: unknown;
  };
}

export interface RetrievedEvidence {
  id: string;
  score: number;
  title: string;
}

export interface ConflictItem {
  policy_key: string;
  values: string[];
  evidence_ids: string[];
}

export interface ResolutionMemoryItem {
  id: number;
  problem: string;
  final_response: string;
  success_score: number;
}

export interface ResolveResponse {
  draft_id: number;
  summary: string;
  resolution: string;
  draft_response: string;
  evidence_ids: string[];
  retrieved_evidence_ids: string[];
  retrieved_evidence: RetrievedEvidence[];
  confidence: number;
  requires_review: boolean;
  decision: Decision;
  verification: Verification;
  context: CustomerContext;
  evidence: EvidenceItem[];
  conflicts: ConflictItem[];
  resolution_memory: ResolutionMemoryItem[];
}

export interface TicketListItem {
  id: number;
  customer_message: string;
  status: string;
  context: CustomerContext;
}

export interface TicketDetail {
  id: number;
  customer_message: string;
  context: CustomerContext;
  status: string;
  draft: {
    id: number;
    summary: string;
    resolution: string;
    draft_response: string;
    confidence: number;
    decision: Decision;
    evidence: EvidenceItem[];
    verification: Verification;
  } | null;
}

export interface FeedbackPayload {
  decision: FeedbackDecision;
  edited_response?: string;
  rating?: number;
  reason?: string;
}

export interface AnalyticsOverview {
  tickets: number;
  resolutions: number;
  feedback: number;
  acceptance_rate: number;
}

export interface KnowledgeGap {
  cluster_id: string;
  label: string;
  count: number;
  examples: string[];
}

export interface FullResolution {
  id: number;
  ticket_id: number;
  problem: string;
  context: CustomerContext;
  resolution: string;
  final_response: string;
  outcome: string;
  success_score: number;
  evidence_ids: string[];
  created_at: string;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type PipelineStep =
  | 'idle'
  | 'understanding'
  | 'retrieving'
  | 'arbitrating'
  | 'generating'
  | 'verifying'
  | 'done'
  | 'error';

export type AppPage = 'copilot' | 'customer' | 'memory' | 'analytics' | 'gaps';

export interface DemoScenario {
  label: string;
  message: string;
  context: CustomerContext;
  expectedDecision: Decision;
}

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier?: string;
}
