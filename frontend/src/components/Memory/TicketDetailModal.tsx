import React, { useState, useEffect } from 'react';
import type { TicketDetail, EvidenceItem, ResolveResponse } from '../../types/api';
import { getTicket } from '../../api/client';
import { DecisionBadge, StatusPill, Spinner, EmptyState } from '../common';
import { InteractiveProvenanceGraph } from '../Evidence/InteractiveProvenanceGraph';

interface TicketDetailModalProps {
  ticketId: number;
  onClose: () => void;
}

type TabType = 'overview' | 'graph' | 'evidence' | 'verification';

export function TicketDetailModal({ ticketId, onClose }: TicketDetailModalProps) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getTicket(ticketId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message || 'Failed to load ticket analytics');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const draft = detail?.draft;
  const confidencePct = draft ? Math.round(draft.confidence * 100) : 0;
  const groundednessPct = draft?.verification ? Math.round(draft.verification.groundedness * 100) : 0;
  const evidenceList: EvidenceItem[] = draft?.evidence ?? [];
  const claims = draft?.verification?.claims ?? [];

  return (
    <div className="ticket-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ticket-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="ticket-modal-header">
          <div className="ticket-modal-header-left">
            <span className="ticket-modal-id">Ticket #{ticketId}</span>
            {detail && <StatusPill status={detail.status} size="sm" />}
            {draft && <DecisionBadge decision={draft.decision} />}
          </div>

          <button
            className="ticket-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close (ESC)"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <div className="ticket-modal-loading">
            <Spinner size={32} />
            <p>Loading analytics, metrics, and evidence graph…</p>
          </div>
        ) : error ? (
          <div className="ticket-modal-error">
            <EmptyState icon="⚠" title="Failed to Load Ticket Analytics" sub={error} />
          </div>
        ) : !detail ? (
          <div className="ticket-modal-error">
            <EmptyState icon="○" title="Ticket not found" />
          </div>
        ) : (
          <>
            {/* KPI Metrics Bar */}
            <div className="ticket-modal-kpi-bar">
              <div className="ticket-modal-kpi">
                <span className="ticket-modal-kpi-label">AI Confidence</span>
                <span className="ticket-modal-kpi-value" style={{ color: confidencePct >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                  {confidencePct}%
                </span>
                <div className="ticket-modal-kpi-bar-mini">
                  <div
                    className="ticket-modal-kpi-bar-fill"
                    style={{
                      width: `${confidencePct}%`,
                      background: confidencePct >= 75 ? 'var(--success)' : 'var(--warning)',
                    }}
                  />
                </div>
              </div>

              <div className="ticket-modal-kpi">
                <span className="ticket-modal-kpi-label">Groundedness</span>
                <span className="ticket-modal-kpi-value" style={{ color: groundednessPct >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                  {groundednessPct}%
                </span>
                <div className="ticket-modal-kpi-bar-mini">
                  <div
                    className="ticket-modal-kpi-bar-fill"
                    style={{
                      width: `${groundednessPct}%`,
                      background: groundednessPct >= 70 ? 'var(--success)' : 'var(--warning)',
                    }}
                  />
                </div>
              </div>

              <div className="ticket-modal-kpi">
                <span className="ticket-modal-kpi-label">Retrieved Evidences</span>
                <span className="ticket-modal-kpi-value" style={{ color: 'var(--brand-cyan)' }}>
                  {evidenceList.length}
                </span>
                <span className="ticket-modal-kpi-sub">policy documents</span>
              </div>

              <div className="ticket-modal-kpi">
                <span className="ticket-modal-kpi-label">Verification Claims</span>
                <span className="ticket-modal-kpi-value" style={{ color: draft?.verification?.passed ? 'var(--success)' : 'var(--warning)' }}>
                  {claims.length}
                </span>
                <span className="ticket-modal-kpi-sub">
                  {draft?.verification?.passed ? '✓ Passed Entailment' : 'Review Flagged'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="ticket-modal-tabs">
              <button
                className={`ticket-modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview & Resolution
              </button>
              <button
                className={`ticket-modal-tab ${activeTab === 'graph' ? 'active' : ''}`}
                onClick={() => setActiveTab('graph')}
              >
                Provenance Graph ⬡
              </button>
              <button
                className={`ticket-modal-tab ${activeTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setActiveTab('evidence')}
              >
                Evidence Provenance ({evidenceList.length})
              </button>
              <button
                className={`ticket-modal-tab ${activeTab === 'verification' ? 'active' : ''}`}
                onClick={() => setActiveTab('verification')}
              >
                Claim Verification ({claims.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="ticket-modal-body">
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="ticket-modal-section-grid">
                  {/* Customer Query */}
                  <div className="ticket-detail-card">
                    <div className="ticket-detail-card-title">Customer Query</div>
                    <div className="ticket-detail-message-box">
                      {detail.customer_message}
                    </div>

                    {/* Customer Context Badges */}
                    <div className="ticket-detail-context-list">
                      <span className="ticket-context-pill">
                        <strong>Tier:</strong> {detail.context.tier ?? detail.context.customer_segment ?? 'Standard'}
                      </span>
                      {detail.context.product && (
                        <span className="ticket-context-pill">
                          <strong>Product:</strong> {detail.context.product}
                        </span>
                      )}
                      {detail.context.region && (
                        <span className="ticket-context-pill">
                          <strong>Region:</strong> {detail.context.region}
                        </span>
                      )}
                      {detail.context.urgency && (
                        <span className="ticket-context-pill">
                          <strong>Urgency:</strong> {detail.context.urgency}
                        </span>
                      )}
                      {detail.context.account_state && (
                        <span className="ticket-context-pill">
                          <strong>Account:</strong> {detail.context.account_state}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resolution Draft */}
                  {draft ? (
                    <div className="ticket-detail-card">
                      <div className="ticket-detail-card-title">
                        Human-Approved AI Resolution Response
                      </div>
                      <div className="ticket-detail-resolution-box">
                        {draft.draft_response.split('\n\n').map((para, i) => (
                          <p key={i} style={{ margin: i === 0 ? 0 : '0.6em 0 0 0' }}>
                            {para}
                          </p>
                        ))}
                      </div>

                      {draft.summary && (
                        <div className="ticket-detail-summary-box">
                          <strong>Core Resolution Summary:</strong>
                          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                            {draft.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="ticket-detail-card">
                      <EmptyState
                        icon="○"
                        title="No Draft Generated Yet"
                        sub="This ticket was created but has not been resolved by the AI copilot yet."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Graph */}
              {activeTab === 'graph' && (
                <div style={{ height: 480, minHeight: 480, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                  {draft ? (
                    <InteractiveProvenanceGraph
                      result={{
                        draft_id: draft.id,
                        summary: draft.summary,
                        resolution: draft.resolution,
                        draft_response: draft.draft_response,
                        evidence_ids: draft.evidence ? draft.evidence.map(e => e.id) : [],
                        retrieved_evidence_ids: draft.evidence ? draft.evidence.map(e => e.id) : [],
                        retrieved_evidence: draft.evidence ? draft.evidence.map(e => ({ id: e.id, score: e.score, title: e.title })) : [],
                        confidence: draft.confidence,
                        requires_review: false,
                        decision: draft.decision,
                        context: detail.context,
                        evidence: draft.evidence ?? [],
                        conflicts: [],
                        verification: draft.verification,
                        resolution_memory: (draft as any).resolution_memory ?? [],
                      }}
                      height={480}
                    />
                  ) : (
                    <EmptyState
                      icon="⬡"
                      title="No Provenance Graph Available"
                      sub="This ticket does not have an associated resolution draft."
                    />
                  )}
                </div>
              )}

              {/* Tab 2: Evidence */}
              {activeTab === 'evidence' && (
                <div className="ticket-modal-evidence-list">
                  {evidenceList.length === 0 ? (
                    <EmptyState
                      icon="📄"
                      title="No Evidence Records"
                      sub="No policy or knowledge documents were associated with this draft."
                    />
                  ) : (
                    evidenceList.map((ev, index) => {
                      const isExpanded = expandedEvidenceId === ev.id;
                      const authVal = typeof ev.metadata?.authority === 'number'
                        ? Math.round(ev.metadata.authority * 100)
                        : ev.metadata?.authority ?? 85;

                      return (
                        <div key={ev.id || index} className="ticket-evidence-item">
                          <div
                            className="ticket-evidence-header"
                            onClick={() => setExpandedEvidenceId(isExpanded ? null : ev.id)}
                          >
                            <div className="ticket-evidence-header-left">
                              <span className="ticket-evidence-num">#{index + 1}</span>
                              <span className="ticket-evidence-title">{ev.title || ev.id}</span>
                              <span className="ticket-evidence-badge">
                                {ev.source_type || 'KNOWLEDGE_DOC'}
                              </span>
                            </div>

                            <div className="ticket-evidence-header-right">
                              <span className="ticket-evidence-stat">
                                Score: <strong>{(ev.score ?? 0).toFixed(3)}</strong>
                              </span>
                              <span className="ticket-evidence-stat">
                                Authority: <strong>{authVal}%</strong>
                              </span>
                              <button className="ticket-evidence-expand-btn">
                                {isExpanded ? 'Collapse ▲' : 'View Full Text ▼'}
                              </button>
                            </div>
                          </div>

                          <div className={`ticket-evidence-content ${isExpanded ? 'expanded' : 'preview'}`}>
                            {ev.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 3: Verification */}
              {activeTab === 'verification' && (
                <div className="ticket-modal-claims-list">
                  <div className="ticket-verification-summary-banner">
                    <div>
                      <strong>Groundedness Verification Result:</strong>{' '}
                      {draft?.verification?.passed ? (
                        <span style={{ color: 'var(--success)' }}>✓ Passed (Reliable Entailment)</span>
                      ) : (
                        <span style={{ color: 'var(--warning)' }}>⚠ Flagged for Human Review</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      Overall Groundedness Index: {groundednessPct}%
                    </div>
                  </div>

                  {claims.length === 0 ? (
                    <EmptyState
                      icon="✓"
                      title="No Claims Analyzed"
                      sub="Claim breakdown is not available for this draft."
                    />
                  ) : (
                    claims.map((c, i) => {
                      const isSupported = c.status === 'SUPPORTED';
                      const isPartial = c.status === 'PARTIALLY_SUPPORTED';
                      const statusColor = isSupported
                        ? 'var(--success)'
                        : isPartial
                        ? 'var(--warning)'
                        : 'var(--error)';

                      return (
                        <div key={i} className="ticket-claim-card">
                          <div className="ticket-claim-header">
                            <span
                              className="ticket-claim-status-pill"
                              style={{
                                color: statusColor,
                                borderColor: statusColor,
                                background: `${statusColor}18`,
                              }}
                            >
                              {c.status}
                            </span>
                            <span className="ticket-claim-entailment">
                              Entailment: <strong>{Math.round(c.entailment * 100)}%</strong>
                            </span>
                          </div>

                          <div className="ticket-claim-text">"{c.claim}"</div>

                          {c.evidence_ids && c.evidence_ids.length > 0 && (
                            <div className="ticket-claim-evidence-ids">
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                Grounded in evidence:
                              </span>
                              {c.evidence_ids.map((id) => (
                                <span key={id} className="ticket-claim-ev-chip">
                                  📄 {id}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
