import { useState, useCallback } from 'react';
import type { CustomerContext, ResolveResponse, PipelineStep } from '../types/api';
import { createTicket, resolveTicket, submitFeedback } from '../api/client';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { ResolutionPanel } from '../components/Resolution/ResolutionPanel';
import { EvidencePanel } from '../components/Evidence/EvidencePanel';
import { FeedbackPanel } from '../components/Feedback/FeedbackPanel';

// Pipeline steps and approximate timing for UI progression
const PIPELINE_STEPS: PipelineStep[] = [
  'understanding',
  'retrieving',
  'arbitrating',
  'generating',
  'verifying',
  'done',
];

const STEP_DELAYS = [300, 600, 950, 1400, 1800];

function usePipelineAnimation() {
  const [step, setStep] = useState<PipelineStep>('idle');

  async function animate(): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      function next() {
        if (i >= PIPELINE_STEPS.length) { resolve(); return; }
        setStep(PIPELINE_STEPS[i]);
        const delay = STEP_DELAYS[i] ?? 200;
        i++;
        setTimeout(next, delay);
      }
      next();
    });
  }

  function reset() { setStep('idle'); }

  return { step, animate, reset };
}

// ─── Copilot Page ─────────────────────────────────────────────────────────────

export function CopilotPage() {
  const [result, setResult]             = useState<ResolveResponse | null>(null);
  const [ticketId, setTicketId]         = useState<number | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [humanStatus, setHumanStatus]   = useState<'pending' | 'approved' | 'escalated'>('pending');
  const [showFeedback, setShowFeedback] = useState(false);
  const [editedDraft, setEditedDraft]   = useState('');
  const { step: pipelineStep, animate, reset } = usePipelineAnimation();

  const handleResolve = useCallback(
    async (message: string, context: CustomerContext) => {
      setIsLoading(true);
      setError('');
      setResult(null);
      setHumanStatus('pending');
      setShowFeedback(false);
      setCurrentMessage(message);
      reset();

      try {
        // Animate pipeline while the actual call runs
        const [ticket] = await Promise.all([
          createTicket(message, context),
          animate(),
        ]);
        setTicketId(ticket.id);
        const resolution = await resolveTicket(ticket.id);
        setResult(resolution);
        setEditedDraft(resolution.draft_response);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unable to reach ResolveIQ backend.';
        setError(msg);
        reset();
      } finally {
        setIsLoading(false);
      }
    },
    [animate, reset],
  );

  const handleApprove = useCallback(
    async (response: string) => {
      if (!ticketId || !result) return;
      const isEdited = response !== result.draft_response;
      setEditedDraft(response);
      try {
        await submitFeedback(ticketId, {
          decision: isEdited ? 'edited' : 'approved',
          edited_response: isEdited ? response : undefined,
          rating: 5,
        });
        setHumanStatus('approved');
        setShowFeedback(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to record approval.';
        setError(msg);
      }
    },
    [ticketId, result],
  );

  const handleEscalate = useCallback(async () => {
    if (!ticketId) return;
    try {
      await submitFeedback(ticketId, { decision: 'rejected', rating: 1, reason: 'Escalated by human agent' });
      setHumanStatus('escalated');
      setShowFeedback(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to record escalation.';
      setError(msg);
    }
  }, [ticketId]);

  const handleClarify = useCallback(async () => {
    if (!ticketId) return;
    try {
      await submitFeedback(ticketId, { decision: 'rejected', rating: 2, reason: 'Agent requested customer clarification' });
    } catch {
      // non-critical
    }
  }, [ticketId]);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--escalate-bg)', border: '1px solid var(--escalate-border)',
            borderRadius: 0, padding: '8px 16px',
            fontSize: 12, color: 'var(--escalate-text)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          ⚠ {error}
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto' }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3-column workspace */}
      <div className="copilot-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Customer conversation */}
        <ChatPanel
          onResolve={handleResolve}
          isLoading={isLoading}
          currentMessage={currentMessage}
        />

        {/* CENTER: AI Resolution */}
        <ResolutionPanel
          result={result}
          pipelineStep={pipelineStep}
          onApprove={handleApprove}
          onEscalate={handleEscalate}
          onClarify={handleClarify}
          ticketId={ticketId}
        />

        {/* RIGHT: Evidence + Graph + Feedback */}
        <div className="panel" style={{ overflow: 'hidden' }}>
          {!showFeedback ? (
            <EvidencePanel result={result} humanStatus={humanStatus} />
          ) : (
            <>
              <div className="panel__header">
                <div className="panel__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  Feedback
                </div>
              </div>
              <div className="panel__body">
                <FeedbackPanel
                  result={result!}
                  ticketId={ticketId!}
                  editedResponse={editedDraft}
                  onFeedbackDone={() => setShowFeedback(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
