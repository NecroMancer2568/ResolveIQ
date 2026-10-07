import { useState, useCallback, useEffect } from 'react';
import type { CustomerContext, ResolveResponse, PipelineStep, TicketListItem } from '../types/api';
import { createTicket, resolveTicket, submitFeedback, getTicket, listTickets } from '../api/client';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { ResolutionPanel } from '../components/Resolution/ResolutionPanel';
import { EvidencePanel } from '../components/Evidence/EvidencePanel';
import { FeedbackPanel } from '../components/Feedback/FeedbackPanel';
import { subscribeLiveEvents, broadcastLiveEvent, type LiveEvent } from '../lib/liveSync';

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

interface InboundTicketItem {
  ticketId: number;
  message: string;
  context: CustomerContext;
  status: 'pending' | 'resolved' | 'escalated';
  result?: ResolveResponse;
  timestamp: string;
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

  // Real-time live queue state
  const [liveQueue, setLiveQueue]       = useState<InboundTicketItem[]>([]);
  const [autoSync, setAutoSync]         = useState(true);
  const [liveAlert, setLiveAlert]       = useState<string | null>(null);
  const [feedbackAlert, setFeedbackAlert] = useState<string | null>(null);

  // Load ticket into workspace
  const loadTicketIntoWorkspace = useCallback(async (tId: number, queryMsg?: string, res?: ResolveResponse) => {
    setIsLoading(true);
    setError('');
    setTicketId(tId);
    setHumanStatus('pending');
    setShowFeedback(false);

    if (res) {
      setResult(res);
      setEditedDraft(res.draft_response);
      if (queryMsg) setCurrentMessage(queryMsg);
      setIsLoading(false);
      return;
    }

    try {
      const detail = await getTicket(tId);
      setCurrentMessage(detail.customer_message);
      if (detail.draft) {
        const syntheticResponse: ResolveResponse = {
          draft_id: detail.draft.id,
          summary: detail.draft.summary,
          resolution: detail.draft.resolution,
          draft_response: detail.draft.draft_response,
          evidence_ids: detail.draft.evidence ? detail.draft.evidence.map((e) => e.id) : [],
          retrieved_evidence_ids: detail.draft.evidence ? detail.draft.evidence.map((e) => e.id) : [],
          retrieved_evidence: detail.draft.evidence ? detail.draft.evidence.map((e) => ({ id: e.id, score: e.score, title: e.title })) : [],
          confidence: detail.draft.confidence,
          requires_review: !detail.draft.verification?.passed,
          decision: detail.draft.decision,
          verification: detail.draft.verification,
          context: detail.context,
          evidence: detail.draft.evidence || [],
          conflicts: [],
          resolution_memory: [],
        };
        setResult(syntheticResponse);
        setEditedDraft(detail.draft.draft_response);
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Failed to load ticket';
      setError(errText);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to real-time live events
  useEffect(() => {
    const unsubscribe = subscribeLiveEvents((event: LiveEvent) => {
      if (event.type === 'CUSTOMER_QUERY_SUBMITTED') {
        const item: InboundTicketItem = {
          ticketId: event.ticketId,
          message: event.message,
          context: event.context,
          status: 'pending',
          timestamp: event.timestamp,
        };

        setLiveQueue((prev) => {
          const filtered = prev.filter((p) => p.ticketId !== event.ticketId);
          return [item, ...filtered].slice(0, 8);
        });

        setLiveAlert(`⚡ Inbound Customer Inquiry: Ticket #${event.ticketId} — "${event.message.slice(0, 50)}…"`);
        setTimeout(() => setLiveAlert(null), 6000);
      }

      if (event.type === 'TICKET_RESOLVED_BY_AI') {
        setLiveQueue((prev) =>
          prev.map((item) =>
            item.ticketId === event.ticketId
              ? { ...item, result: event.result }
              : item,
          ),
        );

        // If autoSync is enabled, immediately load the live resolution into the copilot workspace!
        if (autoSync) {
          loadTicketIntoWorkspace(event.ticketId, event.message, event.result);
        }
      }

      if (event.type === 'CUSTOMER_FEEDBACK_GIVEN') {
        const ratingText = event.feedbackType === 'up' ? '👍 Helpful (5/5)' : '👎 Needs revision';
        setFeedbackAlert(`⭐ Real-time Customer Feedback: Ticket #${event.ticketId} received ${ratingText}! Knowledge loop updated.`);
        setTimeout(() => setFeedbackAlert(null), 7000);

        setLiveQueue((prev) =>
          prev.map((item) =>
            item.ticketId === event.ticketId
              ? { ...item, status: 'resolved' }
              : item,
          ),
        );
      }
    });

    return unsubscribe;
  }, [autoSync, loadTicketIntoWorkspace]);

  // Periodic sync from database to populate initial recent queue
  useEffect(() => {
    let isMounted = true;
    const fetchRecent = () => {
      listTickets()
        .then((tickets: TicketListItem[]) => {
          if (!isMounted) return;
          const mapped: InboundTicketItem[] = tickets.slice(0, 6).map((t) => ({
            ticketId: t.id,
            message: t.customer_message,
            context: t.context,
            status: t.status === 'resolved' ? 'resolved' : 'pending',
            timestamp: 'Recent',
          }));
          setLiveQueue(mapped);
        })
        .catch(() => {});
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
        const [ticket] = await Promise.all([
          createTicket(message, context),
          animate(),
        ]);
        setTicketId(ticket.id);

        broadcastLiveEvent({
          type: 'CUSTOMER_QUERY_SUBMITTED',
          ticketId: ticket.id,
          message,
          context,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        const resolution = await resolveTicket(ticket.id);
        setResult(resolution);
        setEditedDraft(resolution.draft_response);

        broadcastLiveEvent({
          type: 'TICKET_RESOLVED_BY_AI',
          ticketId: ticket.id,
          message,
          context,
          result: resolution,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
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

        // Broadcast real-time approval back to Customer Portal
        broadcastLiveEvent({
          type: 'HUMAN_ACTION_TAKEN',
          ticketId,
          action: isEdited ? 'edited' : 'approved',
          finalResponse: response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
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

      broadcastLiveEvent({
        type: 'HUMAN_ACTION_TAKEN',
        ticketId,
        action: 'escalated',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to record escalation.';
      setError(msg);
    }
  }, [ticketId]);

  const handleClarify = useCallback(async () => {
    if (!ticketId) return;
    try {
      await submitFeedback(ticketId, { decision: 'rejected', rating: 2, reason: 'Agent requested customer clarification' });

      broadcastLiveEvent({
        type: 'HUMAN_ACTION_TAKEN',
        ticketId,
        action: 'clarified',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      // non-critical
    }
  }, [ticketId]);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Real-time Inbound Queue Bar */}
      <div className="copilot-live-bar">
        <div className="copilot-live-status">
          <span className="copilot-live-dot" />
          <span className="copilot-live-title">LIVE INBOUND STREAM</span>
          <span className="copilot-live-badge">Auto-Sync Active</span>
        </div>

        {/* Live Inbound Inquiries Chips */}
        <div className="copilot-live-chips">
          {liveQueue.map((item) => (
            <button
              key={item.ticketId}
              className={`copilot-queue-chip ${ticketId === item.ticketId ? 'active' : ''} ${item.status === 'pending' ? 'pending' : ''}`}
              onClick={() => loadTicketIntoWorkspace(item.ticketId, item.message, item.result)}
              title={`Click to review Ticket #${item.ticketId}: ${item.message}`}
            >
              <span className="copilot-queue-chip-id">#{item.ticketId}</span>
              <span className="copilot-queue-chip-text">
                {item.message.slice(0, 30)}{item.message.length > 30 ? '…' : ''}
              </span>
              <span className={`copilot-queue-chip-status ${item.status}`}>
                {item.status === 'pending' ? 'Review' : 'Resolved'}
              </span>
            </button>
          ))}
        </div>

        {/* Auto-Sync Toggle */}
        <div className="copilot-live-controls">
          <label className="copilot-auto-toggle" title="Automatically load new inbound inquiries into workspace">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />
            <span>Auto-Load Inbound</span>
          </label>
        </div>
      </div>

      {/* Real-Time Live Notification Alerts */}
      {liveAlert && (
        <div className="copilot-live-alert" role="status">
          <span className="copilot-live-alert-icon">⚡</span>
          <span>{liveAlert}</span>
          <button onClick={() => setLiveAlert(null)} aria-label="Dismiss alert">✕</button>
        </div>
      )}

      {feedbackAlert && (
        <div className="copilot-feedback-alert" role="status">
          <span className="copilot-feedback-alert-icon">⭐</span>
          <span>{feedbackAlert}</span>
          <button onClick={() => setFeedbackAlert(null)} aria-label="Dismiss alert">✕</button>
        </div>
      )}

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
