import type {
  CustomerContext,
  ResolveResponse,
  FeedbackPayload,
  AnalyticsOverview,
  KnowledgeGap,
  TicketListItem,
} from '../types/api';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function createTicket(
  message: string,
  context: CustomerContext,
): Promise<{ id: number; status: string }> {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify({
      customer_message: message,
      customer_context: context,
    }),
  });
}

export async function resolveTicket(ticketId: number): Promise<ResolveResponse> {
  return request(`/tickets/${ticketId}/resolve`, { method: 'POST' });
}

export async function listTickets(): Promise<TicketListItem[]> {
  return request('/tickets');
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function submitFeedback(
  ticketId: number,
  payload: FeedbackPayload,
): Promise<{ ok: boolean }> {
  return request(`/tickets/${ticketId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsOverview> {
  return request('/analytics/overview');
}

export async function getKnowledgeGaps(): Promise<KnowledgeGap[]> {
  return request('/analytics/knowledge-gaps');
}

// ─── Resolution Memory (uses ticket list + status) ───────────────────────────
// The backend does not expose a dedicated /resolutions endpoint.
// We derive resolved tickets from GET /tickets and their draft status.
export async function getResolvedTickets(): Promise<TicketListItem[]> {
  const all = await listTickets();
  return all.filter((t) => t.status === 'resolved');
}

export { ApiError };
