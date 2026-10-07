import { useEffect, useState } from 'react';
import type { PipelineStep } from '../../types/api';

interface StepDef {
  key: PipelineStep;
  label: string;
}

const STEPS: StepDef[] = [
  { key: 'understanding',  label: 'Understanding request' },
  { key: 'retrieving',     label: 'Retrieving evidence' },
  { key: 'arbitrating',    label: 'Evidence arbitration' },
  { key: 'generating',     label: 'Generating resolution' },
  { key: 'verifying',      label: 'Claim verification' },
  { key: 'done',           label: 'Pipeline complete' },
];

const STEP_ORDER: PipelineStep[] = [
  'idle', 'understanding', 'retrieving', 'arbitrating', 'generating', 'verifying', 'done',
];

function getStepState(stepKey: PipelineStep, currentStep: PipelineStep): 'pending' | 'active' | 'done' {
  const stepIdx    = STEP_ORDER.indexOf(stepKey);
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  if (currentIdx < stepIdx) return 'pending';
  if (currentIdx === stepIdx) return 'active';
  return 'done';
}

interface PipelineTrackerProps {
  step: PipelineStep;
}

export function PipelineTracker({ step }: PipelineTrackerProps) {
  const [times, setTimes] = useState<Partial<Record<PipelineStep, number>>>({});
  const [startTs, setStartTs] = useState<Partial<Record<PipelineStep, number>>>({});

  useEffect(() => {
    if (step === 'idle') {
      setTimes({});
      setStartTs({});
      return;
    }

    setStartTs((prev) => {
      if (prev[step] !== undefined) return prev;
      return { ...prev, [step]: Date.now() };
    });

    return () => {
      setTimes((prev) => {
        const s = startTs[step];
        if (s === undefined) return prev;
        return { ...prev, [step]: Date.now() - s };
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 'idle') return null;

  return (
    <div className="pipeline fade-in">
      <div className="pipeline__title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 6 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Resolution Pipeline
      </div>
      {STEPS.map(({ key, label }) => {
        const state = getStepState(key, step);
        const elapsed = times[key];
        return (
          <div key={key} className={`pipeline__step pipeline__step--${state}`}>
            <div className="pipeline__step-icon">
              {state === 'done'   && '✓'}
              {state === 'active' && <span className="spinner" />}
              {state === 'pending' && '·'}
            </div>
            <span className="pipeline__step-label">{label}</span>
            {elapsed !== undefined && (
              <span className="pipeline__step-time">{elapsed}ms</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
