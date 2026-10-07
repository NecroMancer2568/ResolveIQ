import type { CustomerContext, ResolveResponse } from '../types/api';

export type LiveEventType =
  | 'CUSTOMER_QUERY_SUBMITTED'
  | 'TICKET_RESOLVED_BY_AI'
  | 'HUMAN_ACTION_TAKEN'
  | 'CUSTOMER_FEEDBACK_GIVEN';

export interface CustomerQueryEvent {
  type: 'CUSTOMER_QUERY_SUBMITTED';
  ticketId: number;
  message: string;
  context: CustomerContext;
  timestamp: string;
}

export interface TicketResolvedEvent {
  type: 'TICKET_RESOLVED_BY_AI';
  ticketId: number;
  message: string;
  context: CustomerContext;
  result: ResolveResponse;
  timestamp: string;
}

export interface HumanActionEvent {
  type: 'HUMAN_ACTION_TAKEN';
  ticketId: number;
  action: 'approved' | 'edited' | 'escalated' | 'clarified';
  finalResponse?: string;
  timestamp: string;
}

export interface CustomerFeedbackEvent {
  type: 'CUSTOMER_FEEDBACK_GIVEN';
  ticketId: number;
  rating: number;
  feedbackType: 'up' | 'down';
  reason?: string;
  timestamp: string;
}

export type LiveEvent =
  | CustomerQueryEvent
  | TicketResolvedEvent
  | HumanActionEvent
  | CustomerFeedbackEvent;

type Listener = (event: LiveEvent) => void;

const listeners: Set<Listener> = new Set();
let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel('resolveiq_live_stream');
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.type) {
        listeners.forEach((listener) => {
          try {
            listener(ev.data as LiveEvent);
          } catch (err) {
            console.error('Error in live event listener:', err);
          }
        });
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported or failed to initialize', e);
  }
}

export function broadcastLiveEvent(event: LiveEvent) {
  // 1. Notify listeners in same tab
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('Error in live event listener:', err);
    }
  });

  // 2. Broadcast to other tabs/windows
  if (channel) {
    try {
      channel.postMessage(event);
    } catch (e) {
      console.warn('BroadcastChannel postMessage error', e);
    }
  }

  // 3. Fallback to localStorage event for older browsers or cross-context
  try {
    localStorage.setItem('resolveiq_last_live_event', JSON.stringify({ event, t: Date.now() }));
  } catch {
    // ignore
  }
}

export function subscribeLiveEvents(listener: Listener): () => void {
  listeners.add(listener);

  // Listen to storage event fallback
  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'resolveiq_last_live_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.event) {
          listener(parsed.event as LiveEvent);
        }
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler);
    }
  };
}
