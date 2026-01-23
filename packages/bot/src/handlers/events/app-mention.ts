/**
 * app_mention 이벤트 핸들러
 *
 * @뱁둥이 멘션 시 RAG 기반 Q&A를 처리합니다.
 * Slack의 3초 응답 제한을 고려하여 비동기 처리를 수행합니다.
 */

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { askKnowledgeBase } from '../../services/rag.service.js';
import { saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

// 멘션 텍스트에서 봇 ID를 제거하고 질문만 추출하는 정규식
const BOT_MENTION_REGEX = /<@[A-Z0-9]+>/g;

// 응답 대기 메시지
const THINKING_MESSAGE = '잠시만요, 답변을 준비하고 있어요... 🤔';

// 에러 메시지
const ERROR_MESSAGE =
  '죄송해요, 답변을 생성하는 중에 문제가 발생했어요. 😢\n잠시 후 다시 시도해주세요!';

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

  console.log(`RAG 질문 수신: ${user} - "${query}"`);

  // 응답 대기 메시지 전송 (스레드에 답변)
  const thinkingMessage = await client.chat.postMessage({
    channel,
    text: THINKING_MESSAGE,
    thread_ts: thread_ts || ts,
  });

  try {
    // RAG 질문 처리
    const response = await askKnowledgeBase(query, user, undefined);

    // 응답 메시지 업데이트
    if (thinkingMessage.ts) {
      await client.chat.update({
        channel,
        ts: thinkingMessage.ts,
        text: response.answer,
      });
    }

    // 활동 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'RAG_QUERY',
      userId: user,
      details: {
        query,
        sessionId: response.sessionId,
        hasCitations: !!response.citations?.length,
      },
    });

    console.log(`RAG 응답 완료: ${user}`);
  } catch (error) {
    console.error('RAG 처리 실패:', error);

    // 에러 메시지로 업데이트
    if (thinkingMessage.ts) {
      await client.chat.update({
        channel,
        ts: thinkingMessage.ts,
        text: ERROR_MESSAGE,
      });
    }

    // 에러 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'RAG_ERROR',
      userId: user,
      details: {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
