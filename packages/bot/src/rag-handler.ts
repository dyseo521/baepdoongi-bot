/**
 * RAG Lambda 핸들러
 *
 * SQS에서 질문을 받아 Bedrock Knowledge Base로 처리하고
 * Slack 메시지를 업데이트합니다.
 *
 * 비동기 처리를 통해 Slack의 3초 응답 제한을 우회합니다.
 */

import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { askKnowledgeBase } from './services/rag.service.js';
import { saveLog } from './services/db.service.js';
import { getSecrets } from './services/secrets.service.js';
import { generateId } from './utils/id.js';

/** SQS 메시지 페이로드 타입 */
interface RagQueueMessage {
  channel: string;
  ts: string;
  query: string;
  userId: string;
  threadTs?: string;
  sessionId?: string;
}

// Slack 클라이언트 (지연 초기화)
let slackClient: WebClient | undefined;

/**
 * Slack 클라이언트 초기화
 */
async function getSlackClient(): Promise<WebClient> {
  if (slackClient) return slackClient;

  const secrets = await getSecrets();
  slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  return slackClient;
}

/**
 * 에러 메시지 생성
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('BEDROCK_KNOWLEDGE_BASE_ID')) {
      return '아직 지식 베이스가 설정되지 않았어요. 관리자에게 문의해주세요! 🔧';
    }
    if (error.message.includes('throttling') || error.message.includes('rate')) {
      return '지금 질문이 너무 많아요. 잠시 후 다시 시도해주세요! ⏳';
    }
  }
  return '죄송해요, 답변을 생성하는 중에 문제가 발생했어요. 😢\n잠시 후 다시 시도해주세요!';
}

/**
 * SQS 핸들러
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('[RAG] Received event:', JSON.stringify(event, null, 2));

  const client = await getSlackClient();

  for (const record of event.Records) {
    let message: RagQueueMessage | undefined;

    try {
      message = JSON.parse(record.body) as RagQueueMessage;
      console.log('[RAG] Processing:', message);

      const { channel, ts, query, userId, sessionId } = message;

      // RAG 질의 실행
      const response = await askKnowledgeBase(query, userId, sessionId);

      // Slack 마크다운 변환
      const slackText = response.answer
        .replace(/\*\*([^*]+)\*\*/g, '*$1*')           // **bold** → *bold*
        .replace(/^###\s+(.+)$/gm, '*$1*')             // ### heading → *heading*
        .replace(/^##\s+(.+)$/gm, '*$1*')              // ## heading → *heading*
        .replace(/^#\s+(.+)$/gm, '*$1*')               // # heading → *heading*
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // [text](url) → <url|text>
        .replace(/<@([^>]+)>/g, (match, name) => {
          // 유효한 Slack 사용자 ID (U 또는 W로 시작)만 유지
          return /^[UW][A-Z0-9]+$/.test(name) ? match : `@${name}`;
        });

      // AI 면책 문구 추가
      const finalText = `${slackText}\n\n_이 응답은 AI가 생성했으며, 부정확할 수 있습니다._`;

      // Slack 메시지 업데이트
      await client.chat.update({
        channel,
        ts,
        text: finalText,
      });

      // 성공 로그 기록
      await saveLog({
        logId: generateId('log'),
        type: 'RAG_QUERY',
        userId,
        details: {
          query,
          sessionId: response.sessionId,
          hasCitations: !!response.citations?.length,
          success: true,
        },
      });

      console.log(`[RAG] Successfully processed query for user: ${userId}`);
    } catch (error) {
      console.error('[RAG] Error processing record:', error);

      // 에러 메시지로 Slack 업데이트
      if (message) {
        try {
          await client.chat.update({
            channel: message.channel,
            ts: message.ts,
            text: getErrorMessage(error),
          });

          // 에러 로그 기록
          await saveLog({
            logId: generateId('log'),
            type: 'RAG_ERROR',
            userId: message.userId,
            details: {
              query: message.query,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (slackError) {
          console.error('[RAG] Failed to update Slack message:', slackError);
        }
      }
    }
  }
};
