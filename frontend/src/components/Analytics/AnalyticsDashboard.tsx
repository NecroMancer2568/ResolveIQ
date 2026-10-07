import { useEffect, useState } from 'react';
import type { AnalyticsOverview, KnowledgeGap } from '../../types/api';
import { getAnalytics, getKnowledgeGaps } from '../../api/client';
import { EmptyState, ErrorState } from '../common';
import { Spinner } from '../common';

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}) {
  return (
    <div className={`metric-card fade-in delay-${delay}`}>
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </div>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getAnalytics()
      .then(setOverview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="analytics-page" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Analytics Overview</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Resolution performance, feedback rates, and system health.
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
          <Spinner size={24} />
        </div>
      )}
      {error && <ErrorState message={error} />}
      {!loading && !error && !overview && (
        <EmptyState title="No analytics data" sub="No data available yet." />
      )}
      {overview && (
        <div className="analytics-grid">
          <MetricCard
            label="Tickets Created"
            value={overview.tickets}
            sub="Total support queries"
            delay={1}
          />
          <MetricCard
            label="Resolutions Approved"
            value={overview.resolutions}
            sub="Human-approved resolutions"
            delay={2}
          />
          <MetricCard
            label="Feedback Submissions"
            value={overview.feedback}
            sub="Agent feedback count"
            delay={3}
          />
          <MetricCard
            label="Acceptance Rate"
            value={`${Math.round(overview.acceptance_rate * 100)}%`}
            sub="Approved or edited by human"
            delay={4}
          />
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Gaps ───────────────────────────────────────────────────────────

export function KnowledgeGapsPage() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getKnowledgeGaps()
      .then(setGaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="analytics-page" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Knowledge Gaps</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Clusters of queries that ResolveIQ could not adequately resolve — these indicate gaps in the knowledge base.
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
          <Spinner size={24} />
        </div>
      )}
      {error && <ErrorState message={error} />}
      {!loading && !error && gaps.length === 0 && (
        <EmptyState
          icon="✓"
          title="No knowledge gaps detected"
          sub="All resolved queries have been matched to sufficient evidence."
        />
      )}
      {gaps.length > 0 && (
        <div className="gaps-list">
          {gaps.map((gap, i) => (
            <div key={gap.cluster_id} className={`gap-card fade-in delay-${Math.min(i + 1, 6)}`}>
              <div className="gap-card__label">{gap.label}</div>
              <div className="gap-card__count">{gap.count} occurrence{gap.count !== 1 ? 's' : ''}</div>
              {gap.examples.length > 0 && (
                <div style={{ marginTop: 'var(--sp-2)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Examples:
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {gap.examples.slice(0, 2).map((ex, j) => (
                      <li key={j}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
