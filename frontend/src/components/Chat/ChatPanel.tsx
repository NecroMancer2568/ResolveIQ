import { useState, type KeyboardEvent } from 'react';
import type { CustomerContext, DemoScenario } from '../../types/api';

// ─── Demo scenarios ──────────────────────────────────────────────────────────

const SCENARIOS: DemoScenario[] = [
  {
    label: 'Duplicate charge',
    message: 'I was charged twice for my premium subscription this month.',
    context: { product: 'subscription', region: 'IN', customer_segment: 'student' },
    expectedDecision: 'CLARIFY',
  },
  {
    label: 'Refund not received',
    message: 'I requested a refund 10 days ago but have not received it yet.',
    context: { product: 'premium', region: 'US', customer_segment: 'standard' },
    expectedDecision: 'RESOLVE',
  },
  {
    label: 'Damaged package',
    message: 'My package arrived damaged. I want a replacement or refund.',
    context: { product: 'hardware', region: 'EU', customer_segment: 'enterprise' },
    expectedDecision: 'RESOLVE',
  },
  {
    label: 'Warranty claim (late)',
    message: 'My device is defective. I reported this 2 weeks ago and need a warranty replacement.',
    context: { product: 'hardware', region: 'IN', customer_segment: 'standard' },
    expectedDecision: 'ESCALATE',
  },
  {
    label: 'Suspicious access',
    message: 'There is an unrecognized device logged into my account. I did not authorize this.',
    context: { product: 'premium', region: 'US', customer_segment: 'enterprise' },
    expectedDecision: 'ESCALATE',
  },
  {
    label: 'Ambiguous request',
    message: 'I want my money back.',
    context: { product: 'subscription', region: 'IN', customer_segment: 'student' },
    expectedDecision: 'CLARIFY',
  },
];

const DEMO_DOT_COLORS: Record<string, string> = {
  'Duplicate charge':     'var(--clarify-text)',
  'Refund not received':  'var(--resolve-text)',
  'Damaged package':      'var(--resolve-text)',
  'Warranty claim (late)':'var(--escalate-text)',
  'Suspicious access':    'var(--escalate-text)',
  'Ambiguous request':    'var(--clarify-text)',
};

// ─── Customer Context ─────────────────────────────────────────────────────────

const DEFAULT_CONTEXT: CustomerContext = {
  product: 'subscription',
  region: 'IN',
  customer_segment: 'student',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  onResolve: (message: string, context: CustomerContext) => void;
  isLoading: boolean;
  currentMessage: string;
}

export function ChatPanel({ onResolve, isLoading, currentMessage }: ChatPanelProps) {
  const [message, setMessage] = useState(SCENARIOS[0].message);
  const [context, setContext] = useState<CustomerContext>({ ...SCENARIOS[0].context, ...DEFAULT_CONTEXT });

  function applyScenario(s: DemoScenario) {
    setMessage(s.message);
    setContext({ ...DEFAULT_CONTEXT, ...s.context });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    if (!message.trim() || isLoading) return;
    onResolve(message.trim(), context);
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <div className="panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Customer Conversation
        </div>
      </div>

      <div className="panel__body">
        {/* Demo scenarios */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--sp-2)' }}>Demo Scenarios</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                className="demo-chip"
                onClick={() => applyScenario(s)}
                aria-label={`Load demo: ${s.label}`}
              >
                <span
                  className="demo-chip__dot"
                  style={{ background: DEMO_DOT_COLORS[s.label] ?? 'var(--text-tertiary)' }}
                />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer card */}
        <div className="customer-card">
          <div className="customer-card__header">
            <div className="customer-card__avatar">AM</div>
            <div>
              <div className="customer-card__name">Alex Morgan</div>
              <div className="customer-card__meta">Ticket #{Date.now().toString().slice(-6)}</div>
            </div>
          </div>
          <div className="customer-card__fields">
            <div>
              <div className="customer-card__field-label">Product</div>
              <div className="customer-card__field-value">{context.product ?? '—'}</div>
            </div>
            <div>
              <div className="customer-card__field-label">Region</div>
              <div className="customer-card__field-value">{context.region ?? '—'}</div>
            </div>
            <div>
              <div className="customer-card__field-label">Segment</div>
              <div className="customer-card__field-value">{context.customer_segment ?? '—'}</div>
            </div>
            <div>
              <div className="customer-card__field-label">Urgency</div>
              <div className="customer-card__field-value">{context.urgency ?? 'Normal'}</div>
            </div>
          </div>
        </div>

        {/* Current or submitted message */}
        {currentMessage && (
          <div className="message-bubble fade-in">
            {currentMessage}
          </div>
        )}

        {/* Composer */}
        <div className="composer">
          <textarea
            id="customer-message"
            className="composer__textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter the customer's message…"
            aria-label="Customer message"
            disabled={isLoading}
          />
          <div className="composer__footer">
            <span className="composer__hint">⌘↵ to resolve</span>
            <button
              id="resolve-btn"
              className="btn btn--primary"
              onClick={submit}
              disabled={isLoading || !message.trim()}
              aria-label="Resolve ticket"
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                  Resolving…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Resolve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
