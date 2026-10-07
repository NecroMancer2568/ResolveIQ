import { useState } from 'react';
import type { ResolveResponse } from '../../types/api';
import { submitFeedback } from '../../api/client';

interface FeedbackPanelProps {
  result: ResolveResponse;
  ticketId: number;
  editedResponse: string;
  onFeedbackDone: () => void;
}

export function FeedbackPanel({
  result,
  ticketId,
  editedResponse,
  onFeedbackDone,
}: FeedbackPanelProps) {
  const [rating, setRating] = useState(0);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(thumbs: 'up' | 'down') {
    setLoading(true);
    setError('');
    try {
      await submitFeedback(ticketId, {
        decision: editedResponse !== result.draft_response ? 'edited' : 'approved',
        edited_response: editedResponse !== result.draft_response ? editedResponse : undefined,
        rating: thumbs === 'up' ? (rating || 5) : (rating || 2),
        reason: reason || undefined,
      });
      setSubmitted(true);
      setTimeout(onFeedbackDone, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="feedback-success fade-in">
        <div className="feedback-success__icon">✓</div>
        <div className="feedback-success__title">Feedback recorded</div>
        <div className="feedback-success__sub">
          Your approval helps improve future resolution ranking.
        </div>
        {result.resolution_memory.length > 0 && (
          <div style={{
            marginTop: 'var(--sp-3)',
            background: 'var(--brand-blue-glow)',
            border: '1px solid var(--brand-blue-dim)',
            borderRadius: 'var(--r-lg)', padding: 'var(--sp-3) var(--sp-4)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-blue)', marginBottom: 4 }}>
              Added to Resolution Memory
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Organizational knowledge updated
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="feedback-panel">
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--sp-3)' }}>
        How was this recommendation?
      </div>

      {/* Stars */}
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 'var(--sp-1)' }}>Rating</div>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`rating__star ${n <= rating ? 'filled' : ''}`}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 'var(--sp-1)' }}>
          Reason <span style={{ fontStyle: 'italic' }}>(optional)</span>
        </div>
        <textarea
          className="draft-editor"
          style={{ minHeight: 60, fontSize: 12 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Accurate but response was too long"
          aria-label="Feedback reason"
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 'var(--sp-2)' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button
          id="feedback-thumbs-up"
          className="btn btn--resolve"
          onClick={() => submit('up')}
          disabled={loading}
          aria-label="Mark recommendation as accurate"
        >
          👍 Accurate
        </button>
        <button
          id="feedback-thumbs-down"
          className="btn btn--escalate"
          onClick={() => submit('down')}
          disabled={loading}
          aria-label="Mark recommendation as needs improvement"
        >
          👎 Needs improvement
        </button>
      </div>

      <div style={{ marginTop: 'var(--sp-3)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Your feedback trains the resolution ranking model and contributes to organizational memory.
      </div>
    </div>
  );
}
