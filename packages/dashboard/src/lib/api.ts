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
  // TODO: 실제 API 연결
  return [
    {
      submissionId: 'sub_001',
      name: '서동윤',
      studentId: '12231234',
      email: 'seo@example.com',
      department: '컴퓨터공학과',
      status: 'pending',
      submittedAt: '2024-01-23T10:00:00Z',
      createdAt: '2024-01-23T10:00:00Z',
    },
    {
      submissionId: 'sub_002',
      name: '김철수',
      studentId: '12221111',
      email: 'kim@example.com',
      department: '전자공학과',
      status: 'matched',
      submittedAt: '2024-01-22T14:00:00Z',
      matchedDepositId: 'dep_001',
      matchedAt: '2024-01-22T15:30:00Z',
      createdAt: '2024-01-22T14:00:00Z',
    },
  ];
}

// Payments - Deposits
export async function fetchDeposits(): Promise<Deposit[]> {
  // TODO: 실제 API 연결
  return [
    {
      depositId: 'dep_001',
      depositorName: '김철수',
      amount: 30000,
      timestamp: '2024-01-22T15:30:00Z',
      status: 'matched',
      rawNotification: '김철수님이 30,000원을 입금했습니다',
      matchedSubmissionId: 'sub_002',
      matchedAt: '2024-01-22T15:30:00Z',
      createdAt: '2024-01-22T15:30:00Z',
    },
    {
      depositId: 'dep_002',
      depositorName: '박영희23',
      amount: 30000,
      timestamp: '2024-01-23T11:00:00Z',
      status: 'pending',
      rawNotification: '박영희23님이 30,000원을 입금했습니다',
      createdAt: '2024-01-23T11:00:00Z',
    },
  ];
}

// Payments - Matches
export async function fetchMatches(): Promise<Match[]> {
  // TODO: 실제 API 연결
  return [
    {
      matchId: 'match_001',
      submissionId: 'sub_002',
      depositId: 'dep_001',
      resultType: 'auto',
      confidence: 95,
      reason: '이름 일치 + 시간 차이 1.5시간',
      timeDifferenceMinutes: 90,
      createdAt: '2024-01-22T15:30:00Z',
    },
  ];
}

// Payment Stats
export async function fetchPaymentStats(): Promise<PaymentStats> {
  // TODO: 실제 API 연결
  return {
    totalSubmissions: 45,
    submissionsByStatus: {
      pending: 12,
      matched: 28,
      invited: 3,
      joined: 2,
    },
    totalDeposits: 35,
    depositsByStatus: {
      pending: 5,
      matched: 28,
      expired: 2,
    },
    autoMatchRate: 78,
    totalAmount: 1050000,
  };
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
