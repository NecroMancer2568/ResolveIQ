interface ConfidenceMeterProps {
  value: number; // 0–1
}

function getLevel(v: number): { label: string; color: string } {
  if (v >= 0.75) return { label: 'High confidence', color: 'var(--conf-high)' };
  if (v >= 0.45) return { label: 'Medium confidence', color: 'var(--conf-med)' };
  return { label: 'Low confidence', color: 'var(--conf-low)' };
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const pct = Math.round(value * 100);
  const { label, color } = getLevel(value);

  return (
    <div
      className="confidence-meter"
      data-tooltip="Confidence reflects retrieval quality, context matching, and claim verification signals."
    >
      <div className="confidence-meter__header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="confidence-meter__value" style={{ color }}>
            {pct}%
          </span>
          <span className="confidence-meter__label">Confidence</span>
        </div>
        <span className="confidence-meter__level" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="confidence-meter__track">
        <div
          className="confidence-meter__fill"
          style={{ width: `${pct}%`, background: color }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Confidence: ${pct}%`}
        />
      </div>
    </div>
  );
}
