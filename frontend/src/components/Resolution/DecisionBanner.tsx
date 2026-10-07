import type { Decision } from '../../types/api';

interface DecisionBannerProps {
  decision: Decision;
  reason?: string;
}

const DECISION_CONFIG: Record<Decision, {
  icon: string;
  label: string;
  title: string;
  sub: string;
  cls: string;
}> = {
  RESOLVE: {
    icon: '✓',
    label: 'Resolve',
    title: 'Resolution ready for human review',
    sub: 'Evidence is sufficient. A draft response has been generated.',
    cls: 'resolve',
  },
  CLARIFY: {
    icon: '?',
    label: 'Clarify',
    title: 'Additional customer information required',
    sub: 'The request is ambiguous. ResolveIQ cannot safely resolve without more context.',
    cls: 'clarify',
  },
  ABSTAIN: {
    icon: '⊘',
    label: 'Abstain',
    title: 'Insufficient evidence — human intervention required',
    sub: 'ResolveIQ does not have enough grounded information to produce a safe resolution.',
    cls: 'abstain',
  },
  ESCALATE: {
    icon: '↗',
    label: 'Escalate',
    title: 'Security or policy escalation required',
    sub: 'This case requires immediate human/security review.',
    cls: 'escalate',
  },
};

export function DecisionBanner({ decision, reason }: DecisionBannerProps) {
  const cfg = DECISION_CONFIG[decision];
  return (
    <div
      className={`decision-banner decision-banner--${cfg.cls}`}
      role="status"
      aria-label={`Decision: ${decision}`}
    >
      <div className="decision-banner__icon">{cfg.icon}</div>
      <div className="decision-banner__content">
        <div className="decision-banner__label">{cfg.label}</div>
        <div className="decision-banner__title">{cfg.title}</div>
        <div className="decision-banner__sub">{reason ?? cfg.sub}</div>
      </div>
    </div>
  );
}
