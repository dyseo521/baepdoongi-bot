/**
 * DM Worker Lambda 핸들러
 *
 * SQS에서 단체 DM 요청을 받아 Slack DM을 발송합니다.
 * Rate Limiting을 준수하기 위해 배치 처리 및 딜레이를 적용합니다.
 */

import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { saveLog, completeBulkDMJob, updateBulkDMJobProgress } from './services/db.service.js';
import { getSecrets } from './services/secrets.service.js';
import { generateId, formatEventDateTimeForDisplay } from './utils/index.js';
import { DM_TEMPLATES } from '@baepdoongi/shared';

/** SQS 메시지 페이로드 타입 */
interface DMQueueMessage {
  jobId: string;
  eventId: string;
  userIds: string[];
  templateId: string;
  customMessage?: string;
  eventTitle: string;
  eventDatetime: string;
  eventLocation?: string;
  // 새 날짜/시간 필드
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isMultiDay?: boolean;
  hasTime?: boolean;
}

// Slack 클라이언트 (지연 초기화)
let slackClient: WebClient | undefined;

// 배치 처리 설정
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 1200; // 1.2초 (Rate Limit 준수)
const DELAY_BETWEEN_DMS_MS = 100; // 개별 DM 간 딜레이

/**
 * Slack 클라이언트 초기화
 */
async function getSlackClient(): Promise<WebClient> {
  if (slackClient) return slackClient;

  const secrets = await getSecrets();
  slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  return slackClient;
}

/** 템플릿 렌더링 옵션 */
interface RenderTemplateOptions {
  templateId: string;
  customMessage?: string;
  eventTitle: string;
  eventDatetime: string;
  eventLocation?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isMultiDay?: boolean;
  hasTime?: boolean;
}

/**
 * 템플릿 변수 치환
 */
function renderTemplate(options: RenderTemplateOptions): string {
  const {
    templateId,
    customMessage,
    eventTitle,
    eventDatetime,
    eventLocation,
    startDate,
    endDate,
    startTime,
    endTime,
    isMultiDay,
    hasTime,
  } = options;

  const template = DM_TEMPLATES.find((t) => t.templateId === templateId);
  if (!template) {
    return customMessage || '';
  }

  // custom 템플릿이면 customMessage 직접 반환
  if (templateId === 'custom') {
    return customMessage || '';
  }

  // 날짜 포맷팅 (새 필드가 있으면 사용, 없으면 기존 datetime 사용)
  const datetime = formatEventDateTimeForDisplay({
    startDate,
    endDate,
    startTime,
    endTime,
    isMultiDay,
    hasTime,
    datetime: eventDatetime,
  });

  return template.messageTemplate
    .replace(/\{\{eventTitle\}\}/g, eventTitle)
    .replace(/\{\{datetime\}\}/g, datetime)
    .replace(/\{\{location\}\}/g, eventLocation || '미정')
    .replace(/\{\{customMessage\}\}/g, customMessage || '');
}

/**
 * 단일 DM 발송
 */
async function sendDM(
  client: WebClient,
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // DM 채널 열기
    const conversation = await client.conversations.open({
      users: userId,
    });

    if (!conversation.ok || !conversation.channel?.id) {
      return { success: false, error: 'DM 채널 열기 실패' };
    }

    // 메시지 전송
    const result = await client.chat.postMessage({
      channel: conversation.channel.id,
      text: message,
      mrkdwn: true,
    });

    if (!result.ok) {
      return { success: false, error: '메시지 전송 실패' };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DM Worker] Failed to send DM to ${userId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 딜레이 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SQS 핸들러
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('[DM Worker] Received event:', JSON.stringify(event, null, 2));

  const client = await getSlackClient();

  for (const record of event.Records) {
    let message: DMQueueMessage | undefined;

    try {
      message = JSON.parse(record.body) as DMQueueMessage;
      console.log('[DM Worker] Processing:', {
        jobId: message.jobId,
        eventId: message.eventId,
        userCount: message.userIds.length,
        templateId: message.templateId,
      });

      const {
        jobId,
        eventId,
        userIds,
        templateId,
        customMessage,
        eventTitle,
        eventDatetime,
        eventLocation,
        startDate,
        endDate,
        startTime,
        endTime,
        isMultiDay,
        hasTime,
      } = message;

      // 작업 시작 - status를 'processing'으로 업데이트
      await updateBulkDMJobProgress(jobId, 0, 0, 'processing');

      // 메시지 렌더링
      const renderedMessage = renderTemplate({
        templateId,
        customMessage,
        eventTitle,
        eventDatetime,
        eventLocation,
        startDate,
        endDate,
        startTime,
        endTime,
        isMultiDay,
        hasTime,
      });

      if (!renderedMessage) {
        throw new Error('메시지 렌더링 실패');
      }

      let sentCount = 0;
      let failedCount = 0;
      const errors: Array<{ userId: string; error: string }> = [];

      // 배치 처리
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        for (const userId of batch) {
          const result = await sendDM(client, userId, renderedMessage);

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            errors.push({ userId, error: result.error || 'Unknown error' });
          }

          // 개별 DM 간 딜레이
          await delay(DELAY_BETWEEN_DMS_MS);
        }

        // 진행 상황 업데이트
        await updateBulkDMJobProgress(jobId, sentCount, failedCount, errors.length > 0 ? errors : undefined);

        // 배치 간 딜레이 (마지막 배치 제외)
        if (i + BATCH_SIZE < userIds.length) {
          await delay(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      // 작업 완료 처리
      const status = failedCount === 0 ? 'completed' : (sentCount === 0 ? 'failed' : 'completed');
      await completeBulkDMJob(jobId, status, sentCount, failedCount, errors.length > 0 ? errors : undefined);

      // 완료 로그 기록
      await saveLog({
        logId: generateId('log'),
        type: status === 'failed' ? 'BULK_DM_FAILED' : 'BULK_DM_COMPLETE',
        userId: 'system',
        eventId,
        details: {
          jobId,
          templateId,
          sentCount,
          failedCount,
          totalCount: userIds.length,
        },
      });

      console.log(`[DM Worker] Completed job ${jobId}: ${sentCount} sent, ${failedCount} failed`);
    } catch (error) {
      console.error('[DM Worker] Error processing record:', error);

      // 작업 실패 처리
      if (message) {
        try {
          await completeBulkDMJob(message.jobId, 'failed', 0, message.userIds.length, [
            { userId: 'system', error: error instanceof Error ? error.message : 'Unknown error' },
          ]);

          await saveLog({
            logId: generateId('log'),
            type: 'BULK_DM_FAILED',
            userId: 'system',
            eventId: message.eventId,
            details: {
              jobId: message.jobId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (logError) {
          console.error('[DM Worker] Failed to log error:', logError);
        }
      }
    }
  }
};
