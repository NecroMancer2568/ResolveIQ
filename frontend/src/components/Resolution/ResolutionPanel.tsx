import { useState } from 'react';
import type { ResolveResponse } from '../../types/api';
import { DecisionBanner } from './DecisionBanner';
import { ConfidenceMeter } from './ConfidenceMeter';
import { PipelineTracker } from './PipelineTracker';
import { SectionTitle } from '../common';
import type { PipelineStep } from '../../types/api';

interface ResolutionPanelProps {
  result: ResolveResponse | null;
  pipelineStep: PipelineStep;
  onApprove: (editedResponse: string) => void;
  onEscalate: () => void;
  onClarify: () => void;
  ticketId: number | null;
}

const WHY_FACTORS: Record<string, string[]> = {
  RESOLVE: [
    'Relevant policy found in knowledge base',
    'Customer context matched available evidence',
    'Evidence scored above confidence threshold',
    'No security or credential escalation detected',
    'Claim verification passed',
  ],
  CLARIFY: [
    'Customer request contains ambiguous terms',
    'Multiple interpretations possible',
    'Additional context required before safe resolution',
  ],
  ABSTAIN: [
    'Required information not present in corpus',
    'Cannot promise outcome without verified data',
    'Evidence insufficient for grounded response',
  ],
  ESCALATE: [
    'Security or policy concern detected',
    'Human/security review is mandatory',
    'Automated resolution would be unsafe',
  ],
};

export function ResolutionPanel({
  result,
  pipelineStep,
  onApprove,
  onEscalate,
  onClarify,
  ticketId,
}: ResolutionPanelProps) {
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync draft when result arrives
  if (result && draft !== result.draft_response && !isEditing) {
    setDraft(result.draft_response);
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <div className="panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          AI Resolution Workspace
        </div>
        {ticketId && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Ticket #{ticketId}
          </span>
        )}
      </div>

      <div className="panel__body">
        {/* Pipeline progress */}
        <PipelineTracker step={pipelineStep} />

        {!result && pipelineStep === 'idle' && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '60vh', gap: 'var(--sp-4)',
              color: 'var(--text-tertiary)', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.25 }}>⬡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Resolution Workspace
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 280 }}>
              Submit a customer query to see the full ResolveIQ pipeline:
              retrieval → arbitration → generation → verification → human review.
            </div>
          </div>
        )}

        {result && (
          <>
            {/* Decision banner */}
            <DecisionBanner decision={result.decision} />

            {/* Human review required notice */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                fontSize: 11, color: 'var(--text-tertiary)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)',
                padding: '6px 12px',
                marginBottom: 'var(--sp-4)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <strong style={{ color: 'var(--text-secondary)' }}>Human review required</strong>
              — ResolveIQ recommends; the agent decides.
            </div>

            {/* Confidence */}
            <ConfidenceMeter value={result.confidence} />

            <hr className="divider" />

            {/* Issue summary */}
            <div className="card fade-in">
              <div className="card__header">
                <span className="card__label">Issue Summary</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {result.context.intent ?? 'general_support'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {result.summary}
              </p>
            </div>

            {/* Recommended resolution */}
            <div className="card fade-in delay-1">
              <div className="card__header">
                <span className="card__label">Recommended Resolution</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {result.resolution}
              </p>
            </div>

            {/* Context extracted */}
            <div className="card fade-in delay-2">
              <div className="card__header">
                <span className="card__label">Extracted Context</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                {Object.entries(result.context).map(([k, v]) =>
                  v && k !== '_original_question' ? (
                    <div key={k}>
                      <div className="customer-card__field-label">{k}</div>
                      <div className="customer-card__field-value" style={{ fontSize: 12 }}>{String(v)}</div>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            <hr className="divider" />

            {/* Draft response editor */}
            <SectionTitle>Draft Response</SectionTitle>
            <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--brand-blue-glow)', border: '1px solid var(--brand-blue-dim)', borderRadius: 'var(--r-pill)', color: 'var(--brand-blue)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                AI Generated
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Edit before approving
              </span>
            </div>
            <textarea
              id="draft-response"
              className="draft-editor"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setIsEditing(true); }}
              aria-label="Draft response — edit before approving"
            />

            {/* Why this decision */}
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <div className="section-title">Why ResolveIQ chose this action</div>
              {(WHY_FACTORS[result.decision] ?? []).map((factor, i) => (
                <div
                  key={i}
                  className={`verification-item fade-in delay-${i + 1}`}
                  style={{ marginBottom: 4 }}
                >
                  <div className="verification-item__icon verification-item--supported__icon" style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--resolve-bg)', border: '1px solid var(--resolve-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'var(--resolve-text)', flexShrink: 0,
                  }}>✓</div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{factor}</span>
                </div>
              ))}
              {result.conflicts.length > 0 && (
                <div style={{ marginTop: 'var(--sp-2)' }}>
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="conflict-alert">
                      <div className="conflict-alert__header">⚠ Policy Conflict: {c.policy_key}</div>
                      <div className="conflict-alert__body">Conflicting values: {c.values.join(' vs ')}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.resolution_memory.length > 0 && (
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <div className="section-title">Resolution Memory</div>
                  {result.resolution_memory.slice(0, 2).map((m, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                        borderLeft: '3px solid var(--brand-blue)',
                        borderRadius: 'var(--r-md)', padding: 'var(--sp-3)',
                        marginBottom: 'var(--sp-2)', fontSize: 12,
                      }}
                    >
                      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                        {m.problem.slice(0, 100)}{m.problem.length > 100 ? '…' : ''}
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                        Success score: {Math.round(m.success_score * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Human Review */}
            <hr className="divider" />
            <div className="review-card">
              <div className="review-card__header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue)" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <div>
                  <div className="review-card__label">Human Review</div>
                  <div className="review-card__sub">AI recommends · Agent decides</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>AI Recommendation</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.decision}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Confidence</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{Math.round(result.confidence * 100)}%</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Claims verified</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {result.verification.claims.filter(c => c.status === 'SUPPORTED').length} / {result.verification.claims.length}
                  </strong>
                </div>
              </div>
              <div className="review-card__actions">
                <button
                  id="approve-btn"
                  className="btn btn--resolve btn--full"
                  onClick={() => onApprove(draft)}
                  aria-label="Approve and send resolution"
                >
                  ✓ Approve &amp; Send
                </button>
                <button
                  className="btn btn--ghost btn--full"
                  onClick={() => { setIsEditing(true); document.getElementById('draft-response')?.focus(); }}
                  aria-label="Edit response"
                >
                  ✎ Edit Response
                </button>
                <button
                  id="escalate-btn"
                  className="btn btn--escalate btn--full"
                  onClick={onEscalate}
                  aria-label="Escalate to human agent"
                >
                  ↗ Escalate
                </button>
                <button
                  id="clarify-btn"
                  className="btn btn--clarify btn--full"
                  onClick={onClarify}
                  aria-label="Request customer clarification"
                >
                  ? Request Clarification
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
