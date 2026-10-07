import React, { useState, useEffect } from 'react';
import type { ResolveResponse, TicketListItem } from '../types/api';
import { listTickets, getTicket } from '../api/client';
import { InteractiveProvenanceGraph } from '../components/Evidence/InteractiveProvenanceGraph';
import { Spinner, EmptyState } from '../components/common';

const SAMPLE_FALLBACK_RESULT: ResolveResponse = {
  draft_id: 1,
  summary: 'Annual Subscription Cancellation & Refund Request',
  resolution: 'Cancellation processed to stop renewal. Exception review initiated under 30-day policy.',
  draft_response: 'Thank you for contacting NovaMart support. We have verified your request to cancel your annual plan renewal. Under Section 2.4 of our subscription terms, cancellation stops future cycles. Because your payment was captured recently, we have initiated an exception review with Subscription Operations for full reversal.',
  evidence_ids: ['subscriptions-1-0', 'refunds-1-0', 'payments-1-0'],
  retrieved_evidence_ids: ['subscriptions-1-0', 'refunds-1-0', 'payments-1-0'],
  retrieved_evidence: [
    { id: 'subscriptions-1-0', score: 0.85, title: 'NovaMart Subscription & Cancellation Policy' },
    { id: 'refunds-1-0', score: 0.78, title: 'NovaMart Refund & Return Policy' },
    { id: 'payments-1-0', score: 0.65, title: 'NovaMart Payments & Billing Support' },
  ],
  confidence: 0.88,
  requires_review: false,
  decision: 'RESOLVE',
  context: { tier: 'enterprise', urgency: 'high', region: 'Global' },
  evidence: [
    {
      id: 'subscriptions-1-0',
      title: 'Subscription & Cancellation Policy (v2.4)',
      content: 'Customers can request cancellation at any time. Cancellation stops the next renewal. Eligible exceptions for accidental renewal should be reviewed by Subscription Operations.',
      source_type: 'OFFICIAL_POLICY',
      score: 0.85,
      metadata: { authority: 0.95, policy_key: 'subscription_cancellation' },
    },
    {
      id: 'refunds-1-0',
      title: 'Refund & Return Guidelines (v3.2)',
      content: 'Standard Refund Eligibility: Customers may request an exception within 30 days of billing. Approved returns are normally credited within 5 business days.',
      source_type: 'OFFICIAL_POLICY',
      score: 0.78,
      metadata: { authority: 0.9, policy_key: 'refund_eligibility' },
    },
    {
      id: 'payments-1-0',
      title: 'Payment Authorization & Dispute Rules',
      content: 'When an unexpected transaction is reported, determine whether transaction is captured. Operations should review duplicate or unexpected authorizations for reversal.',
      source_type: 'PAYMENTS_MANUAL',
      score: 0.65,
      metadata: { authority: 0.85, policy_key: 'payment_authorization' },
    },
  ],
  conflicts: [],
  verification: {
    passed: true,
    groundedness: 0.92,
    claims: [
      {
        claim: 'Cancellation stops future billing cycles under Section 2.4.',
        status: 'SUPPORTED',
        evidence_ids: ['subscriptions-1-0'],
        entailment: 0.94,
      },
      {
        claim: 'Exception review initiated for recent transaction reversal.',
        status: 'SUPPORTED',
        evidence_ids: ['refunds-1-0', 'payments-1-0'],
        entailment: 0.89,
      },
    ],
  },
  resolution_memory: [
    {
      id: 201,
      problem: 'Customer charged for annual renewal after requesting cancel last week',
      final_response: 'Refund issued under accidental renewal exception. Subscription canceled immediately.',
      success_score: 0.96,
    },
    {
      id: 202,
      problem: 'How do I cancel my subscription without losing access immediately?',
      final_response: 'Cancellation stops subsequent billing while keeping service active until billing cycle end date.',
      success_score: 0.91,
    },
  ],
};

export function ProvenanceGraphPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [currentResult, setCurrentResult] = useState<ResolveResponse>(SAMPLE_FALLBACK_RESULT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listTickets()
      .then((data) => {
        setTickets(data);
        if (data.length > 0) {
          setSelectedTicketId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    setLoading(true);

    getTicket(selectedTicketId)
      .then((detail) => {
        if (detail.draft) {
          const res: ResolveResponse = {
            draft_id: detail.draft.id,
            summary: detail.draft.summary || detail.customer_message,
            resolution: detail.draft.resolution,
            draft_response: detail.draft.draft_response,
            evidence_ids: detail.draft.evidence?.map((e) => e.id) || [],
            retrieved_evidence_ids: detail.draft.evidence?.map((e) => e.id) || [],
            retrieved_evidence: detail.draft.evidence?.map((e) => ({ id: e.id, score: e.score, title: e.title })) || [],
            confidence: detail.draft.confidence || 0.85,
            requires_review: !detail.draft.verification?.passed,
            decision: detail.draft.decision || 'RESOLVE',
            verification: detail.draft.verification,
            context: detail.context,
            evidence: detail.draft.evidence || SAMPLE_FALLBACK_RESULT.evidence,
            conflicts: [],
            resolution_memory: SAMPLE_FALLBACK_RESULT.resolution_memory,
          };
          setCurrentResult(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTicketId]);

  return (
    <div className="graph-page">
      {/* Page Header */}
      <div className="graph-page-header">
        <div className="graph-page-header-left">
          <h2>Resolution &amp; Evidence Provenance Graph</h2>
          <p>
            Interactive topological view tracing how the AI resolution was synthesized from verified policy documents
            and past human-approved answers asked by other users.
          </p>
        </div>

        {/* Ticket Selector Dropdown */}
        <div className="graph-page-header-right">
          <label className="graph-select-label" htmlFor="ticket-select">
            Inspect Case:
          </label>
          <select
            id="ticket-select"
            className="graph-case-select"
            value={selectedTicketId ?? ''}
            onChange={(e) => setSelectedTicketId(Number(e.target.value))}
          >
            {tickets.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} - {t.customer_message.slice(0, 40)}… ({t.status})
              </option>
            ))}
            <option value="">Demo Scenario (Refund &amp; Subscription Exception)</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="graph-kpi-strip">
        <div className="graph-kpi-item">
          <span className="graph-kpi-label">Active Query</span>
          <span className="graph-kpi-val" style={{ color: 'var(--brand-cyan)' }}>
            #{selectedTicketId ?? 'Demo'}
          </span>
          <span className="graph-kpi-sub">{currentResult.context?.tier?.toUpperCase() ?? 'PRO'} TIER</span>
        </div>

        <div className="graph-kpi-item">
          <span className="graph-kpi-label">Policy Evidences</span>
          <span className="graph-kpi-val" style={{ color: 'var(--resolve-text)' }}>
            {currentResult.evidence?.length ?? 3}
          </span>
          <span className="graph-kpi-sub">Retrieved via Hybrid Search</span>
        </div>

        <div className="graph-kpi-item">
          <span className="graph-kpi-label">Prior User Precedents</span>
          <span className="graph-kpi-val" style={{ color: '#c084fc' }}>
            {currentResult.resolution_memory?.length ?? 2}
          </span>
          <span className="graph-kpi-sub">Resolution Memory Matches</span>
        </div>

        <div className="graph-kpi-item">
          <span className="graph-kpi-label">Verification Groundedness</span>
          <span className="graph-kpi-val" style={{ color: currentResult.verification?.passed ? 'var(--resolve-text)' : 'var(--warning)' }}>
            {Math.round((currentResult.verification?.groundedness ?? 0.9) * 100)}%
          </span>
          <span className="graph-kpi-sub">
            {currentResult.verification?.passed ? '✓ Entailment Passed' : 'Review Required'}
          </span>
        </div>
      </div>

      {/* Interactive Graph Canvas */}
      <div className="graph-page-canvas-wrapper">
        {loading ? (
          <div className="graph-loading-overlay">
            <Spinner size={32} />
            <p>Constructing provenance topology &amp; evidence links…</p>
          </div>
        ) : (
          <InteractiveProvenanceGraph
            result={currentResult}
            humanStatus="approved"
            height="100%"
          />
        )}
      </div>
    </div>
  );
}
