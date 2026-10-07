import React, { useState, useRef, useEffect } from 'react';
import type { CustomerContext, ResolveResponse } from '../types/api';
import { createTicket, resolveTicket, submitFeedback } from '../api/client';
import { broadcastLiveEvent, subscribeLiveEvents } from '../lib/liveSync';

interface ChatMessage {
  id: string;
  sender: 'customer' | 'agent';
  text: string;
  timestamp: string;
  ticketId?: number;
  response?: ResolveResponse;
  feedbackGiven?: 'up' | 'down';
  humanStatus?: 'approved' | 'edited' | 'escalated' | 'clarified';
  humanNote?: string;
}

const PRESET_PERSONAS: { label: string; context: CustomerContext }[] = [
  {
    label: 'Pro Customer',
    context: { tier: 'pro', urgency: 'normal', account_state: 'active' },
  },
  {
    label: 'Enterprise VIP',
    context: { tier: 'enterprise', urgency: 'high', account_state: 'active' },
  },
  {
    label: 'Free Tier',
    context: { tier: 'free', urgency: 'low', account_state: 'active' },
  },
];

const SUGGESTED_QUERIES = [
  'How do I request a refund for an annual subscription?',
  'Can I upgrade my plan midway through the billing cycle?',
  'What is the data retention and compliance policy?',
  'My automated webhook notifications stopped working.',
];

export function CustomerChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<CustomerContext>(PRESET_PERSONAS[0].context);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Real-time synchronization: listen to human actions in Copilot
  useEffect(() => {
    const unsubscribe = subscribeLiveEvents((event) => {
      if (event.type === 'HUMAN_ACTION_TAKEN') {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.ticketId === event.ticketId) {
              const note = event.action === 'approved'
                ? '✓ Verified & Approved by Support Specialist'
                : event.action === 'edited'
                ? '✓ Refined & Approved by Support Specialist'
                : event.action === 'escalated'
                ? '↗ Escalated to Tier-2 Specialist'
                : '? Support Specialist requested clarification';

              return {
                ...msg,
                text: event.finalResponse || msg.text,
                humanStatus: event.action,
                humanNote: note,
              };
            }
            return msg;
          }),
        );

        const bannerText = event.action === 'approved'
          ? `Support Specialist reviewed and approved Ticket #${event.ticketId}`
          : event.action === 'edited'
          ? `Support Specialist refined the response for Ticket #${event.ticketId}`
          : `Ticket #${event.ticketId} updated by Support Specialist`;

        setLiveNotice(bannerText);
        setTimeout(() => setLiveNotice(null), 5000);
      }
    });

    return unsubscribe;
  }, []);

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend ?? inputText).trim();
    if (!text || loading) return;

    setErrorMsg(null);
    setInputText('');

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `msg-${Date.now()}`;

    // Add user message
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'customer',
      text,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // 1. Create ticket
      const ticket = await createTicket(text, selectedPersona);

      // Real-time broadcast: query submitted
      broadcastLiveEvent({
        type: 'CUSTOMER_QUERY_SUBMITTED',
        ticketId: ticket.id,
        message: text,
        context: selectedPersona,
        timestamp: now,
      });

      // 2. Resolve ticket
      const res = await resolveTicket(ticket.id);

      // Real-time broadcast: AI draft generated
      broadcastLiveEvent({
        type: 'TICKET_RESOLVED_BY_AI',
        ticketId: ticket.id,
        message: text,
        context: selectedPersona,
        result: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      // 3. Add agent response
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: res.draft_response || res.resolution || 'I have reviewed your query and resolved it based on company policy.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticketId: ticket.id,
        response: res,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Unable to connect to resolution engine';
      setErrorMsg(errText);

      // Fallback agent message
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: `We encountered an issue connecting to our resolution engine (${errText}). Please try asking your question again in a moment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleFeedback = async (msgId: string, ticketId: number, type: 'up' | 'down') => {
    try {
      await submitFeedback(ticketId, {
        decision: type === 'up' ? 'approved' : 'rejected',
        rating: type === 'up' ? 5 : 2,
        reason: type === 'up' ? 'Customer rated response helpful' : 'Customer marked as not helpful',
      });

      // Real-time broadcast: customer feedback given
      broadcastLiveEvent({
        type: 'CUSTOMER_FEEDBACK_GIVEN',
        ticketId,
        rating: type === 'up' ? 5 : 2,
        feedbackType: type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedbackGiven: type } : m)),
      );
    } catch (err) {
      console.error('Feedback submit error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  return (
    <div className="customer-page">
      <div className="customer-chat-shell">
        {/* Support Portal Header */}
        <header className="customer-chat-header">
          <div className="customer-header-left">
            <div className="customer-agent-avatar" aria-hidden="true">
              <span>IQ</span>
              <span className="customer-agent-pulse" />
            </div>
            <div>
              <div className="customer-header-title">
                ResolveIQ Customer Support
                <span className="customer-verified-badge">Verified AI</span>
              </div>
              <div className="customer-header-status">
                Online • Enterprise Policy Intelligence
              </div>
            </div>
          </div>

          <div className="customer-header-right">
            {/* Persona Switcher for demonstration */}
            <div className="customer-persona-select" title="Active Customer Profile Context">
              <span className="customer-persona-label">Customer Profile:</span>
              <select
                aria-label="Customer Profile Tier"
                value={selectedPersona.tier}
                onChange={(e) => {
                  const match = PRESET_PERSONAS.find((p) => p.context.tier === e.target.value);
                  if (match) setSelectedPersona(match.context);
                }}
              >
                {PRESET_PERSONAS.map((p) => (
                  <option key={p.context.tier} value={p.context.tier}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {messages.length > 0 && (
              <button
                className="customer-btn-reset"
                onClick={handleReset}
                title="Start a fresh conversation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                New Chat
              </button>
            )}
          </div>
        </header>

        {/* Live Notification Toast */}
        {liveNotice && (
          <div className="customer-live-toast" role="status">
            <span className="customer-live-toast-dot" />
            <span>{liveNotice}</span>
          </div>
        )}

        {/* Message Area */}
        <div className="customer-messages-area">
          {messages.length === 0 ? (
            <div className="customer-welcome">
              <div className="customer-welcome-icon">💬</div>
              <h2>Hello! How can we help you today?</h2>
              <p>
                Ask anything about your account, subscription, billing policies, or troubleshooting.
                Our AI answers are grounded in company policies and verified knowledge bases.
              </p>

              <div className="customer-suggestions">
                <span className="customer-suggestions-title">Common queries:</span>
                <div className="customer-chips-grid">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      className="customer-query-chip"
                      onClick={() => handleSend(q)}
                    >
                      <span className="customer-chip-arrow">→</span> {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="customer-messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`customer-msg-row customer-msg-row--${msg.sender}`}
                >
                  {msg.sender === 'agent' && (
                    <div className="customer-msg-avatar" aria-hidden="true">
                      IQ
                    </div>
                  )}

                  <div className={`customer-bubble customer-bubble--${msg.sender}`}>
                    {/* Human Approval Status Pill */}
                    {msg.humanStatus && (
                      <div className={`customer-human-tag customer-human-tag--${msg.humanStatus}`}>
                        {msg.humanNote}
                      </div>
                    )}

                    <div className="customer-bubble-text">
                      {msg.text.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx} style={{ margin: pIdx === 0 ? 0 : '0.6em 0 0 0' }}>
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Agent metadata extras */}
                    {msg.sender === 'agent' && msg.response && (
                      <div className="customer-msg-footer">
                        {/* Clarification Notice if decision is CLARIFY */}
                        {msg.response.decision === 'CLARIFY' && (
                          <div className="customer-clarify-box">
                            <strong>Need more information:</strong>
                            <p style={{ margin: '4px 0 0 0' }}>
                              Please reply with any additional details regarding your account or transaction.
                            </p>
                          </div>
                        )}

                        {/* Escalation Notice if decision is ESCALATE */}
                        {msg.response.decision === 'ESCALATE' && (
                          <div className="customer-clarify-box" style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--escalate-text)' }}>
                            <strong>Routed to Senior Support:</strong>
                            <p style={{ margin: '4px 0 0 0' }}>
                              A senior support representative has been notified and will assist you with this ticket.
                            </p>
                          </div>
                        )}

                        {/* Referenced Evidence Source Pills */}
                        {msg.response.evidence && msg.response.evidence.length > 0 && (
                          <div className="customer-citations-box">
                            <span className="customer-citation-label">Verified Sources:</span>
                            {msg.response.evidence.slice(0, 3).map((ev) => (
                              <span key={ev.id} className="customer-citation-pill" title={ev.content}>
                                📖 {ev.title || ev.metadata?.policy_key || ev.id}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Feedback and Ticket Reference */}
                        <div className="customer-feedback-row">
                          <span className="customer-ticket-ref">
                            Ticket #{msg.ticketId} • Grounded ({Math.round(msg.response.confidence * 100)}%)
                          </span>

                          <div className="customer-feedback-actions">
                            {msg.feedbackGiven ? (
                              <span className="customer-feedback-thanks">
                                {msg.feedbackGiven === 'up' ? '👍 Thank you for your feedback!' : '👎 We will improve this response.'}
                              </span>
                            ) : msg.ticketId ? (
                              <>
                                <span className="customer-feedback-prompt">Helpful?</span>
                                <button
                                  className="customer-feedback-btn"
                                  onClick={() => handleFeedback(msg.id, msg.ticketId!, 'up')}
                                  title="Yes, this was helpful"
                                  aria-label="Thumbs up"
                                >
                                  👍
                                </button>
                                <button
                                  className="customer-feedback-btn"
                                  onClick={() => handleFeedback(msg.id, msg.ticketId!, 'down')}
                                  title="No, this did not help"
                                  aria-label="Thumbs down"
                                >
                                  👎
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="customer-bubble-timestamp">{msg.timestamp}</div>
                  </div>

                  {msg.sender === 'customer' && (
                    <div className="customer-msg-avatar customer-msg-avatar--user" aria-hidden="true">
                      You
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Thinking Indicator */}
              {loading && (
                <div className="customer-msg-row customer-msg-row--agent">
                  <div className="customer-msg-avatar" aria-hidden="true">
                    IQ
                  </div>
                  <div className="customer-bubble customer-bubble--agent customer-bubble--loading">
                    <div className="customer-typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="customer-typing-text">
                      Consulting resolution policies and preparing response…
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div className="customer-error-banner" role="alert">
            <span>⚠ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* Input Bar */}
        <footer className="customer-input-area">
          <div className="customer-input-container">
            <textarea
              ref={inputRef}
              className="customer-input-field"
              placeholder="Ask a question about your account, billing, or policies... (Press Enter to send)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
              aria-label="Customer query message"
            />
            <button
              className="customer-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              aria-label="Send query"
              title="Send message (Enter)"
            >
              {loading ? (
                <div className="customer-btn-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          <div className="customer-input-hint">
            ResolveIQ provides verified answers based on enterprise customer service standards.
          </div>
        </footer>
      </div>
    </div>
  );
}
