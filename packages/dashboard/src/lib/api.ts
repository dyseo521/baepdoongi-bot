/**
 * API 서비스
 */

import type {
  DashboardStats,
  DashboardTrends,
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
  RSVPListResponse,
  BulkDMRequest,
  BulkDMJob,
  BulkDMJobResponse,
} from '@baepdoongi/shared';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || '/api';
const IS_MOCK = process.env['NEXT_PUBLIC_USE_MOCK'] === 'true';

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
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.dashboardStats;
  }
  return fetchAPI<DashboardStats>('/stats');
}

export async function fetchDashboardTrends(days: 7 | 14 | 30 = 7): Promise<DashboardTrends> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.generateTrends(days);
  }
  return fetchAPI<DashboardTrends>(`/stats/trends?days=${days}`);
}

// Members
export async function fetchMembers(source: 'db' | 'slack' = 'slack'): Promise<Member[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.members;
  }
  return fetchAPI<Member[]>(`/members?source=${source}`);
}

export async function syncMembers(): Promise<{ count: number }> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(500);
    console.log('[Mock] Members synced');
    return { count: 12 };
  }
  return fetchAPI<{ count: number }>('/members', {
    method: 'POST',
  });
}

export async function warnMember(memberId: string): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    console.log(`[Mock] Warning sent to member ${memberId}`);
    return { success: true };
  }
  return fetchAPI<{ success: boolean }>(`/members/${memberId}/warn`, {
    method: 'POST',
  });
}

// Events
export async function fetchEvents(): Promise<Event[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.events;
  }
  return fetchAPI<Event[]>('/events');
}

export async function createEvent(event: Omit<Event, 'eventId' | 'createdAt'>): Promise<Event> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    const newEvent: Event = {
      ...event,
      eventId: `evt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    console.log('[Mock] Event created:', newEvent);
    return newEvent;
  }
  return fetchAPI<Event>('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function updateEvent(eventId: string, event: Partial<Event>): Promise<Event> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    const existingEvent = mock.events.find((e) => e.eventId === eventId);
    if (!existingEvent) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const updatedEvent: Event = {
      ...existingEvent,
      ...event,
      updatedAt: new Date().toISOString(),
    };
    console.log('[Mock] Event updated:', updatedEvent);
    return updatedEvent;
  }
  return fetchAPI<Event>(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    console.log(`[Mock] Event ${eventId} deleted`);
    return;
  }
  await fetchAPI(`/events/${eventId}`, {
    method: 'DELETE',
  });
}

// Suggestions
export async function fetchSuggestions(): Promise<Suggestion[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.suggestions;
  }
  return fetchAPI<Suggestion[]>('/suggestions');
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: Suggestion['status']
): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    console.log(`[Mock] Suggestion ${suggestionId} status updated to ${status}`);
    return { success: true };
  }
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
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.generateLogsResponse(options);
  }

  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.type) params.set('type', options.type);

  const queryString = params.toString();
  const endpoint = queryString ? `/logs?${queryString}` : '/logs';

  return fetchAPI(endpoint);
}

// Payments - Submissions
export async function fetchSubmissions(): Promise<Submission[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.submissions;
  }
  return fetchAPI<Submission[]>('/payments/submissions');
}

// Payments - Deposits
export async function fetchDeposits(): Promise<Deposit[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.deposits;
  }
  return fetchAPI<Deposit[]>('/payments/deposits');
}

// Payments - Matches
export async function fetchMatches(): Promise<Match[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.matches;
  }
  return fetchAPI<Match[]>('/payments/matches');
}

// Payment Stats
export async function fetchPaymentStats(): Promise<PaymentStats> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.paymentStats;
  }
  return fetchAPI<PaymentStats>('/payments/stats');
}

// Manual Match
export async function manualMatch(
  submissionId: string,
  depositId: string
): Promise<Match> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    const newMatch: Match = {
      matchId: `match-${Date.now()}`,
      submissionId,
      depositId,
      resultType: 'manual',
      confidence: 100,
      reason: '수동 매칭',
      timeDifferenceMinutes: 0,
      matchedBy: 'dashboard',
      createdAt: new Date().toISOString(),
    };
    console.log('[Mock] Manual match created:', newMatch);
    return newMatch;
  }
  const response = await fetchAPI<Match>('/payments/match', {
    method: 'POST',
    body: JSON.stringify({ submissionId, depositId }),
  });
  return response;
}

// Send Invite Email
export async function sendInviteEmail(submissionId: string): Promise<void> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(500);
    console.log(`[Mock] Invite email sent for submission ${submissionId}`);
    return;
  }
  await fetchAPI('/payments/invite', {
    method: 'POST',
    body: JSON.stringify({ submissionId }),
  });
}

// Delete Submission
export async function deleteSubmission(submissionId: string): Promise<void> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    console.log(`[Mock] Submission ${submissionId} deleted`);
    return;
  }
  await fetchAPI(`/payments/submissions/${submissionId}`, {
    method: 'DELETE',
  });
}

// Delete Deposit
export async function deleteDeposit(depositId: string): Promise<void> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    console.log(`[Mock] Deposit ${depositId} deleted`);
    return;
  }
  await fetchAPI(`/payments/deposits/${depositId}`, {
    method: 'DELETE',
  });
}

// Slack Channels
export async function fetchSlackChannels(): Promise<SlackChannel[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.slackChannels;
  }
  return fetchAPI<SlackChannel[]>('/slack/channels');
}

// Event Announcement
export async function announceEvent(
  eventId: string,
  channelId: string,
  responseOptions: EventResponseOption[],
  allowMultipleSelection?: boolean
): Promise<AnnounceEventResponse> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(500);
    const channel = mock.slackChannels.find((c) => c.id === channelId);
    console.log(`[Mock] Event ${eventId} announced to ${channel?.name || channelId}`);
    return {
      success: true,
      messageTs: `${Date.now()}.123456`,
      channelName: channel?.name || 'unknown',
    };
  }
  return fetchAPI<AnnounceEventResponse>(`/events/${eventId}/announce`, {
    method: 'POST',
    body: JSON.stringify({ channelId, responseOptions, allowMultipleSelection }),
  });
}

// Event RSVPs
export async function fetchEventRSVPs(eventId: string): Promise<RSVPListResponse> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.getEventRSVPs(eventId);
  }
  return fetchAPI<RSVPListResponse>(`/events/${eventId}/rsvps`);
}

// Bulk DM
export async function sendBulkDM(
  eventId: string,
  request: BulkDMRequest
): Promise<BulkDMJobResponse> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay(300);
    const response = mock.createBulkDMJob(
      eventId,
      request.userIds,
      request.templateId,
      request.customMessage
    );
    console.log(`[Mock] Bulk DM job created for event ${eventId}:`, response);
    return response;
  }
  return fetchAPI<BulkDMJobResponse>(`/events/${eventId}/bulk-dm`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getBulkDMJob(eventId: string, jobId: string): Promise<BulkDMJob> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    const job = mock.getBulkDMJob(eventId, jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }
  return fetchAPI<BulkDMJob>(`/events/${eventId}/bulk-dm/${jobId}`);
}

// DM History
export async function getEventDMHistory(eventId: string): Promise<BulkDMJob[]> {
  if (IS_MOCK) {
    const mock = await import('./mock-data');
    await mock.mockDelay();
    return mock.getEventDMHistory(eventId);
  }
  const response = await fetchAPI<{ jobs: BulkDMJob[] }>(`/events/${eventId}/dm-history`);
  return response.jobs;
}
