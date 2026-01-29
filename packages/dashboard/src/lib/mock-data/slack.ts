/**
 * Slack 관련 더미 데이터
 */

import type { SlackChannel, BulkDMJob, BulkDMJobResponse } from '@baepdoongi/shared';

export const slackChannels: SlackChannel[] = [
  { id: 'C001', name: 'general' },
  { id: 'C002', name: 'seminars' },
  { id: 'C003', name: 'random' },
  { id: 'C004', name: 'announcements' },
  { id: 'C005', name: 'study-react' },
  { id: 'C006', name: 'study-backend' },
  { id: 'C007', name: 'project-2026' },
  { id: 'C008', name: 'help-desk' },
];

// DM 작업 히스토리 (이벤트별)
export const bulkDMJobs: Record<string, BulkDMJob[]> = {
  'evt-001': [
    {
      jobId: 'dm-job-001',
      eventId: 'evt-001',
      templateId: 'remind',
      customMessage: '참석 여부 확인 부탁드립니다!',
      userIds: ['U001', 'U002', 'U003', 'U004', 'U005'],
      totalCount: 5,
      sentCount: 5,
      failedCount: 0,
      status: 'completed',
      createdAt: '2026-01-25T10:00:00Z',
      completedAt: '2026-01-25T10:01:00Z',
    },
  ],
  'evt-002': [],
};

let jobCounter = 1;

export function createBulkDMJob(
  eventId: string,
  userIds: string[],
  templateId: string,
  customMessage?: string
): BulkDMJobResponse {
  const jobId = `dm-job-${Date.now()}-${jobCounter++}`;

  const job: BulkDMJob = {
    jobId,
    eventId,
    templateId,
    userIds,
    totalCount: userIds.length,
    sentCount: 0,
    failedCount: 0,
    status: 'queued',
    createdAt: new Date().toISOString(),
    ...(customMessage && { customMessage }),
  };

  // 저장
  if (!bulkDMJobs[eventId]) {
    bulkDMJobs[eventId] = [];
  }
  bulkDMJobs[eventId].push(job);

  return {
    jobId,
    totalCount: userIds.length,
    status: 'queued',
  };
}

export function getBulkDMJob(eventId: string, jobId: string): BulkDMJob | undefined {
  const jobs = bulkDMJobs[eventId] || [];
  const job = jobs.find((j) => j.jobId === jobId);

  if (job && job.status === 'queued') {
    // 시뮬레이션: 조회 시 완료 처리
    job.status = 'completed';
    job.sentCount = job.totalCount;
    job.completedAt = new Date().toISOString();
  }

  return job;
}

export function getEventDMHistory(eventId: string): BulkDMJob[] {
  return bulkDMJobs[eventId] || [];
}
