/**
 * app_mention 이벤트 핸들러
 *
 * @뱁둥이 멘션 시 RAG 기반 Q&A를 처리합니다.
 * SQS를 통한 비동기 처리로 Slack의 3초 응답 제한을 우회합니다.
 */

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

// 멘션 텍스트에서 봇 ID를 제거하고 질문만 추출하는 정규식
const BOT_MENTION_REGEX = /<@[A-Z0-9]+>/g;

// 응답 대기 메시지
const THINKING_MESSAGE = '잠시만요, 답변을 준비하고 있어요... 🤔';

// SQS 클라이언트
const sqsClient = new SQSClient({
  region: process.env['AWS_REGION'] || 'ap-northeast-2',
});

// RAG Queue URL
const RAG_QUEUE_URL = process.env['RAG_QUEUE_URL'] || '';

/** SQS 메시지 페이로드 타입 */
interface RagQueueMessage {
  channel: string;
  ts: string;
  query: string;
  userId: string;
  threadTs?: string;
  sessionId?: string;
}

export async function handleAppMention({
  event,
  client,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>): Promise<void> {
  const { user, text, channel, thread_ts, ts } = event;

  if (!user || !text) {
    return;
  }

  // 봇 멘션 제거하고 질문 추출
  const query = text.replace(BOT_MENTION_REGEX, '').trim();

  if (!query) {
    await say({
      text: '무엇이든 물어보세요! 동아리에 관한 질문에 답변해드릴게요. 😊',
      thread_ts: thread_ts || ts,
    });
    return;
  }

  console.log(`[app_mention] RAG 질문 수신: ${user} - "${query}"`);

  // SQS Queue URL 확인
  if (!RAG_QUEUE_URL) {
    console.error('[app_mention] RAG_QUEUE_URL이 설정되지 않았습니다.');
    await say({
      text: '죄송해요, 현재 질문 처리 시스템이 설정되지 않았어요. 관리자에게 문의해주세요! 🔧',
      thread_ts: thread_ts || ts,
    });
    return;
  }

  // 응답 대기 메시지 전송 (스레드에 답변)
  const thinkingMessage = await client.chat.postMessage({
    channel,
    text: THINKING_MESSAGE,
    thread_ts: thread_ts || ts,
  });

  if (!thinkingMessage.ts) {
    console.error('[app_mention] Failed to get message timestamp');
    return;
  }

  try {
    // SQS로 비동기 처리 위임
    const message: RagQueueMessage = {
      channel,
      ts: thinkingMessage.ts,
      query,
      userId: user,
      threadTs: thread_ts,
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: RAG_QUEUE_URL,
        MessageBody: JSON.stringify(message),
      })
    );

    // 질문 확인 이모지 추가
    await client.reactions.add({
      channel,
      timestamp: ts,
      name: 'white_check_mark', // ✅
    });

    console.log(`[app_mention] SQS 메시지 발송 완료: ${user}`);

    // 활동 로그 기록 (요청 접수)
    await saveLog({
      logId: generateId('log'),
      type: 'RAG_QUERY',
      userId: user,
      details: {
        query,
        status: 'queued',
      },
    });
  } catch (error) {
    console.error('[app_mention] SQS 발송 실패:', error);

    // 에러 메시지로 업데이트
    await client.chat.update({
      channel,
      ts: thinkingMessage.ts,
      text: '죄송해요, 질문을 처리하는 중에 문제가 발생했어요. 😢\n잠시 후 다시 시도해주세요!',
    });

    // 에러 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'RAG_ERROR',
      userId: user,
      details: {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'queue',
      },
    });
  }
}
