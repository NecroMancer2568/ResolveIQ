import type { Decision } from '../../types/api';

// ─── Badge ──────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {children}
    </span>
  );
}

// ─── Decision Badge ──────────────────────────────────────────────────────────

const DECISION_BADGE: Record<Decision, { variant: BadgeProps['variant']; icon: string }> = {
  RESOLVE:  { variant: 'green',  icon: '✓' },
  CLARIFY:  { variant: 'yellow', icon: '?' },
  ABSTAIN:  { variant: 'purple', icon: '⊘' },
  ESCALATE: { variant: 'red',    icon: '↗' },
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  const { variant, icon } = DECISION_BADGE[decision];
  return (
    <Badge variant={variant}>
      {icon} {decision}
    </Badge>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const map: Record<string, string> = {
    open: 'gray',
    resolved: 'green',
    pending: 'yellow',
    escalated: 'red',
  };
  const variant = (map[status.toLowerCase()] ?? 'gray') as BadgeProps['variant'];
  return <Badge variant={variant} className={size === 'sm' ? 'badge--sm' : ''}>{status}</Badge>;
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${size / 8}px solid var(--brand-blue-dim)`,
        borderTopColor: 'var(--brand-blue)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
      aria-label="Loading"
      role="status"
    />
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  sub?: string;
}

export function EmptyState({ icon = '○', title, sub }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      {sub && <div className="empty-state__sub">{sub}</div>}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">⚠</div>
      <div className="empty-state__title">Something went wrong</div>
      <div className="empty-state__sub">{message}</div>
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="section-title">{children}</div>;
}
