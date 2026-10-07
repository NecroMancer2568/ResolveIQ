import { useEffect, useState } from 'react';
import { listTickets } from '../../api/client';
import type { TicketListItem } from '../../types/api';
import { EmptyState, ErrorState, StatusPill, Spinner } from '../common';
import { TicketDetailModal } from './TicketDetailModal';
import { subscribeLiveEvents } from '../../lib/liveSync';

export function ResolutionMemoryPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'resolved' | 'all'>('resolved');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const fetchTickets = () => {
    listTickets()
      .then(setTickets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, []);

  // Listen to live events and auto-refresh resolution memory
  useEffect(() => {
    const unsubscribe = subscribeLiveEvents(() => {
      fetchTickets();
    });
    return unsubscribe;
  }, []);

  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const targetList = filterMode === 'resolved'
    ? tickets.filter((t) => t.status === 'resolved')
    : tickets;

  const filtered = targetList.filter((t) =>
    t.customer_message.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search) ||
    (t.context.product && t.context.product.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="memory-page" style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-6)' }}>
      {/* Header and Value Proposition */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Resolution Memory & Audit Intelligence
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, maxWidth: 680 }}>
              Human-in-the-loop approved cases directly train ResolveIQ’s hybrid ranking engine.
              Click any ticket below to audit its verified evidences, entailment scores, and resolution metrics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              className={`memory-filter-btn ${filterMode === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilterMode('resolved')}
            >
              ✓ Resolved Cases ({resolvedCount})
            </button>
            <button
              className={`memory-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Tickets ({tickets.length})
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="memory-stats-grid">
          <div className="memory-stat-card">
            <span className="memory-stat-label">Resolved Knowledge Records</span>
            <span className="memory-stat-val" style={{ color: 'var(--resolve-text)' }}>{resolvedCount}</span>
            <span className="memory-stat-hint">Human-approved resolution cases</span>
          </div>

          <div className="memory-stat-card">
            <span className="memory-stat-label">Total Ingested Tickets</span>
            <span className="memory-stat-val" style={{ color: 'var(--brand-blue)' }}>{tickets.length}</span>
            <span className="memory-stat-hint">Active and resolved customer cases</span>
          </div>

          <div className="memory-stat-card">
            <span className="memory-stat-label">Knowledge Feedback Loop</span>
            <span className="memory-stat-val" style={{ color: 'var(--brand-cyan)' }}>Active</span>
            <span className="memory-stat-hint">Fine-tuning future hybrid retrieval</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          id="memory-search"
          type="search"
          placeholder="Search query text, ticket ID, or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search resolution memory"
          style={{
            width: '100%', maxWidth: 440,
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            padding: '9px 14px', outline: 'none',
          }}
        />

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Showing {filtered.length} of {targetList.length} tickets • Click any row to inspect
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-12)' }}>
          <Spinner size={28} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Loading resolution history…</p>
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="◎"
          title={search ? 'No tickets match your search' : 'No resolved tickets yet'}
          sub={search ? 'Try clearing your search query.' : 'Approve a resolution in the Copilot or Customer Portal to populate resolution memory.'}
        />
      )}

      {filtered.length > 0 && (
        <div className="memory-table-container">
          <table className="memory-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Ticket</th>
                <th>Customer Query</th>
                <th style={{ width: 140 }}>Customer Profile</th>
                <th style={{ width: 100 }}>Region</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 180, textAlign: 'right' }}>Audit Analytics</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="memory-table-row--interactive"
                  title="Click to view analytics metrics and evidence provenance"
                >
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-cyan)', fontWeight: 600 }}>
                    #{t.id}
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                      {t.customer_message.slice(0, 90)}{t.customer_message.length > 90 ? '…' : ''}
                    </div>
                  </td>
                  <td>
                    <span className="memory-context-pill">
                      {t.context.tier ?? t.context.product ?? t.context.customer_segment ?? 'Standard'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {t.context.region ?? '—'}
                  </td>
                  <td>
                    <StatusPill status={t.status} size="sm" />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="memory-inspect-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketId(t.id);
                      }}
                      title="Inspect metrics, entailment, and evidence"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      Inspect Metrics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Analytics and Evidence Inspector Modal */}
      {selectedTicketId !== null && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
