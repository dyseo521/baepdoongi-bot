/**
 * API 서비스
 */

import type {
  DashboardStats,
  Member,
  Event,
  Suggestion,
  ActivityLog,
  Submission,
  Deposit,
  Match,
  PaymentStats,
  SlackChannel,
  EventResponseOption,
  AnnounceEventResponse,
} from '@baepdoongi/shared';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include', // 쿠키 전송
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Dashboard
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>('/stats');
}

// Members
export async function fetchMembers(source: 'db' | 'slack' = 'slack'): Promise<Member[]> {
  return fetchAPI<Member[]>(`/members?source=${source}`);
}

export async function syncMembers(): Promise<{ count: number }> {
  return fetchAPI<{ count: number }>('/members', {
    method: 'POST',
  });
}

export async function warnMember(memberId: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/members/${memberId}/warn`, {
    method: 'POST',
  });
}

// Events
export async function fetchEvents(): Promise<Event[]> {
  return fetchAPI<Event[]>('/events');
}

export async function createEvent(event: Omit<Event, 'eventId' | 'createdAt'>): Promise<Event> {
  return fetchAPI<Event>('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function updateEvent(eventId: string, event: Partial<Event>): Promise<Event> {
  return fetchAPI<Event>(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await fetchAPI(`/events/${eventId}`, {
    method: 'DELETE',
  });
}

// Suggestions
export async function fetchSuggestions(): Promise<Suggestion[]> {
  return fetchAPI<Suggestion[]>('/suggestions');
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: Suggestion['status']
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/suggestions/${suggestionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Logs
export async function fetchLogs(options?: { limit?: number; type?: string }): Promise<{
  logs: ActivityLog[];
  todayCount: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.type) params.set('type', options.type);

  const queryString = params.toString();
  const endpoint = queryString ? `/logs?${queryString}` : '/logs';

  return fetchAPI(endpoint);
}

// Payments - Submissions
export async function fetchSubmissions(): Promise<Submission[]> {
  return fetchAPI<Submission[]>('/payments/submissions');
}

// Payments - Deposits
export async function fetchDeposits(): Promise<Deposit[]> {
  return fetchAPI<Deposit[]>('/payments/deposits');
}

// Payments - Matches
export async function fetchMatches(): Promise<Match[]> {
  return fetchAPI<Match[]>('/payments/matches');
}

// Payment Stats
export async function fetchPaymentStats(): Promise<PaymentStats> {
  return fetchAPI<PaymentStats>('/payments/stats');
}

// Manual Match
export async function manualMatch(
  submissionId: string,
  depositId: string
): Promise<Match> {
  const response = await fetchAPI<Match>('/payments/match', {
    method: 'POST',
    body: JSON.stringify({ submissionId, depositId }),
  });
  return response;
}

// Send Invite Email
export async function sendInviteEmail(submissionId: string): Promise<void> {
  await fetchAPI('/payments/invite', {
    method: 'POST',
    body: JSON.stringify({ submissionId }),
  });
}

// Slack Channels
export async function fetchSlackChannels(): Promise<SlackChannel[]> {
  return fetchAPI<SlackChannel[]>('/slack/channels');
}

// Event Announcement
export async function announceEvent(
  eventId: string,
  channelId: string,
  responseOptions: EventResponseOption[]
): Promise<AnnounceEventResponse> {
  return fetchAPI<AnnounceEventResponse>(`/events/${eventId}/announce`, {
    method: 'POST',
    body: JSON.stringify({ channelId, responseOptions }),
  });
}
