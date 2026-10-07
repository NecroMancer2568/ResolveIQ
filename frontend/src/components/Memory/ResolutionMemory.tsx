import { useEffect, useState } from 'react';
import { listTickets } from '../../api/client';
import type { TicketListItem } from '../../types/api';
import { EmptyState, ErrorState, StatusPill } from '../common';
import { Spinner } from '../common';

export function ResolutionMemoryPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    listTickets()
      .then(setTickets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const resolved = tickets.filter((t) => t.status === 'resolved');
  const filtered = resolved.filter((t) =>
    t.customer_message.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="memory-page" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Resolution Memory</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Organizational knowledge grows with every human-approved resolution.
          These approved cases inform future retrieval ranking.
        </p>
      </div>

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <input
          id="memory-search"
          type="search"
          placeholder="Search resolved tickets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search resolution memory"
          style={{
            width: '100%', maxWidth: 400,
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            padding: '8px 14px', outline: 'none',
          }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
          <Spinner size={24} />
        </div>
      )}
      {error && <ErrorState message={error} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="◎"
          title="No resolved tickets yet"
          sub="Approve a resolution in the Copilot to see it appear here."
        />
      )}

      {filtered.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 'var(--sp-3)' }}>
            {filtered.length} resolved ticket{filtered.length !== 1 ? 's' : ''}
          </div>
          <table className="memory-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Query</th>
                <th>Product</th>
                <th>Region</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 11 }}>
                    #{t.id}
                  </td>
                  <td style={{ maxWidth: 340, color: 'var(--text-primary)' }}>
                    {t.customer_message.slice(0, 80)}{t.customer_message.length > 80 ? '…' : ''}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.context.product ?? '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.context.region ?? '—'}</td>
                  <td><StatusPill status={t.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
