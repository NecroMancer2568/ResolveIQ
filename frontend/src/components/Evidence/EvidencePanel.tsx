import { useState } from 'react';
import type { EvidenceItem, ResolveResponse } from '../../types/api';
import { InteractiveProvenanceGraph } from './InteractiveProvenanceGraph';
import { SectionTitle, EmptyState } from '../common';

// ─── Authority label ──────────────────────────────────────────────────────────

function authorityLabel(v: number | string | undefined): { label: string; color: string } {
  if (typeof v === 'string') {
    const lv = v.toLowerCase();
    if (lv === 'high')   return { label: 'HIGH',    color: 'var(--resolve-text)' };
    if (lv === 'medium') return { label: 'MEDIUM',  color: 'var(--clarify-text)' };
    if (lv === 'low')    return { label: 'LOW',      color: 'var(--error)' };
  }
  if (typeof v === 'number') {
    if (v >= 0.8) return { label: 'HIGH',   color: 'var(--resolve-text)' };
    if (v >= 0.5) return { label: 'MEDIUM', color: 'var(--clarify-text)' };
    return          { label: 'LOW',         color: 'var(--error)' };
  }
  return { label: 'CONTEXT', color: 'var(--text-secondary)' };
}

// ─── Verification Panel ───────────────────────────────────────────────────────

function VerificationPanel({ result }: { result: ResolveResponse }) {
  const statusIcon = {
    SUPPORTED:          { icon: '✓', cls: 'supported' },
    PARTIALLY_SUPPORTED:{ icon: '~', cls: 'partial' },
    UNSUPPORTED:        { icon: '✗', cls: 'unsupported' },
  };

  return (
    <div>
      <SectionTitle>Claim Verification</SectionTitle>
      {result.verification.claims.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No claims extracted.</p>
      ) : (
        <div className="verification-list">
          {result.verification.claims.map((c, i) => {
            const { icon, cls } = statusIcon[c.status];
            return (
              <div
                key={i}
                className={`verification-item verification-item--${cls} fade-in delay-${Math.min(i + 1, 6)}`}
              >
                <div className="verification-item__icon">{icon}</div>
                <span className="verification-item__text">{c.claim}</span>
                <span className="verification-item__entailment">
                  {Math.round(c.entailment * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 'var(--sp-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--sp-2) var(--sp-3)',
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-md)', fontSize: 12,
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>Groundedness</span>
        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
          {Math.round(result.verification.groundedness * 100)}%
        </strong>
      </div>

      {result.verification.passed ? (
        <div className="verification-item verification-item--supported" style={{ marginTop: 'var(--sp-2)' }}>
          <div className="verification-item__icon">✓</div>
          <span className="verification-item__text" style={{ fontWeight: 600 }}>All verification checks passed</span>
        </div>
      ) : (
        <div className="verification-item verification-item--unsupported" style={{ marginTop: 'var(--sp-2)' }}>
          <div className="verification-item__icon">✗</div>
          <span className="verification-item__text" style={{ fontWeight: 600 }}>Verification did not fully pass</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Evidence Panel ──────────────────────────────────────────────────────

interface EvidencePanelProps {
  result: ResolveResponse | null;
  humanStatus: 'pending' | 'approved' | 'escalated';
}

type Tab = 'graph' | 'evidence' | 'verification';

export function EvidencePanel({ result, humanStatus }: EvidencePanelProps) {
  const [tab, setTab] = useState<Tab>('graph');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function TabBtn({ id, label }: { id: Tab; label: string }) {
    return (
      <button
        id={`tab-${id}`}
        className={`topbar__nav-btn ${tab === id ? 'active' : ''}`}
        onClick={() => { setTab(id); if (id !== 'graph') setSelectedEvidence(null); }}
        style={{ fontSize: 12, padding: '4px 10px' }}
        aria-selected={tab === id}
        role="tab"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="panel" style={{ background: 'var(--bg-base)' }}>
      <div className="panel__header">
        <div className="panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Evidence &amp; Verification
        </div>
        {result && (
          <div style={{ display: 'flex', gap: 2 }} role="tablist">
            <TabBtn id="graph" label="Graph" />
            <TabBtn id="evidence" label="Evidence" />
            <TabBtn id="verification" label="Checks" />
          </div>
        )}
      </div>

      {!result ? (
        <div className="panel__body">
          <EmptyState
            icon="⬡"
            title="Evidence Provenance Graph"
            sub="Submit a query to see the evidence graph, retrieval scores, and claim verification."
          />
        </div>
      ) : (
        <>
          {/* Graph tab */}
          {tab === 'graph' && (
            <div className="panel__body--no-pad" style={{ height: 'calc(100% - 46px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand-cyan)' }}>
                  Provenance Graph
                </span>
                <button
                  className="btn-graph-fullscreen"
                  onClick={() => setIsFullscreen(true)}
                  title="Expand to Fullscreen Interactive Graph"
                >
                  ⛶ Expand Fullscreen
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 380, position: 'relative' }}>
                <InteractiveProvenanceGraph
                  result={result}
                  humanStatus={humanStatus}
                  height="100%"
                />
              </div>

              {isFullscreen && (
                <div className="graph-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
                  <div className="graph-fullscreen-card" onClick={(e) => e.stopPropagation()}>
                    <div className="graph-fullscreen-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⬡</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                            Resolution &amp; Evidence Provenance Graph
                          </h3>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            Tracing prompt $\to$ policy evidences $\to$ prior user memory $\to$ arbitration $\to$ response
                          </span>
                        </div>
                      </div>
                      <button
                        className="ticket-modal-close-btn"
                        onClick={() => setIsFullscreen(false)}
                        aria-label="Close fullscreen graph"
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <InteractiveProvenanceGraph
                        result={result}
                        humanStatus={humanStatus}
                        height="100%"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence tab */}
          {tab === 'evidence' && (
            <div className="panel__body">
              <SectionTitle>Retrieved Evidence ({result.evidence.length})</SectionTitle>
              {result.evidence.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Evidence retrieval unavailable. ResolveIQ cannot safely produce a fully grounded response.
                </p>
              ) : (
                result.evidence.map((ev, i) => {
                  const { label: authLabel, color: authColor } = authorityLabel(ev.metadata.authority);
                  return (
                    <div
                      key={ev.id}
                      className={`evidence-card fade-in delay-${Math.min(i + 1, 6)} ${selectedEvidence?.id === ev.id ? 'selected' : ''}`}
                      onClick={() => setSelectedEvidence(ev.id === selectedEvidence?.id ? null : ev)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Evidence: ${ev.title}`}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedEvidence(ev)}
                    >
                      <div className="evidence-card__header">
                        <div className="evidence-card__title">{ev.title}</div>
                        <div className="evidence-card__score">{ev.score.toFixed(3)}</div>
                      </div>
                      <div className="evidence-card__meta">
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {ev.source_type}
                        </span>
                        <span style={{ fontSize: 10, color: authColor }}>
                          {authLabel}
                        </span>
                        {ev.metadata.source_file && (
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            {String(ev.metadata.source_file)}
                          </span>
                        )}
                      </div>
                      <div className="evidence-card__preview">{ev.content}</div>
                    </div>
                  );
                })
              )}

              {result.conflicts.length > 0 && (
                <>
                  <div style={{ marginTop: 'var(--sp-4)' }}>
                    <SectionTitle>Conflicts Detected</SectionTitle>
                  </div>
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="conflict-alert">
                      <div className="conflict-alert__header">
                        ⚠ {c.policy_key}
                      </div>
                      <div className="conflict-alert__body">
                        Conflicting values found: <strong>{c.values.join(' / ')}</strong>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {selectedEvidence && (
                <div className="evidence-detail" style={{ marginTop: 'var(--sp-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                    <div className="evidence-detail__title">{selectedEvidence.title}</div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setSelectedEvidence(null)}
                      aria-label="Close evidence detail"
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-secondary)' }}>
                      {selectedEvidence.source_type}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      score {selectedEvidence.score}
                    </span>
                    {selectedEvidence.metadata.authority !== undefined && (() => {
                      const { label, color } = authorityLabel(selectedEvidence.metadata.authority);
                      return (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, color, border: `1px solid ${color}`, background: 'transparent' }}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="evidence-detail__content">
                    {selectedEvidence.content}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification tab */}
          {tab === 'verification' && (
            <div className="panel__body">
              <VerificationPanel result={result} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
