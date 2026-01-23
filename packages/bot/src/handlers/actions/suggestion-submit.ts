/**
 * 익명 건의 모달 제출 핸들러
 *
 * 모달에서 제출된 건의사항을 저장하고 운영진 채널에 알림을 보냅니다.
 */

import type { AllMiddlewareArgs, SlackViewMiddlewareArgs, ViewSubmitAction } from '@slack/bolt';
import type { SuggestionCategory } from '@baepdoongi/shared';
import { saveSuggestion, saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

// 운영진 채널 ID (환경 변수로 설정)
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID || '';

// 카테고리 라벨 매핑
const CATEGORY_LABELS: Record<string, string> = {
  general: '📋 일반 건의',
  study: '📚 스터디/세미나',
  event: '🎉 행사/이벤트',
  budget: '💰 회비/예산',
  facility: '🔧 시설/환경',
  other: '💡 기타',
};

export async function handleSuggestionSubmit({
  ack,
  view,
  client,
}: AllMiddlewareArgs & SlackViewMiddlewareArgs<ViewSubmitAction>): Promise<void> {
  // 모달 닫기 확인
  await ack();

  try {
    // 입력값 추출
    const values = view.state.values;
    const category = (values['category_block']?.['category_select']?.selected_option?.value || 'other') as SuggestionCategory;
    const title = values['title_block']?.['title_input']?.value || '';
    const content = values['content_block']?.['content_input']?.value || '';

    const suggestionId = generateId('suggestion');
    const now = new Date().toISOString();

    // 건의사항 저장
    await saveSuggestion({
      suggestionId,
      category,
      title,
      content,
      status: 'pending',
      createdAt: now,
    });

    // 운영진 채널에 알림 (채널이 설정된 경우)
    if (ADMIN_CHANNEL_ID) {
      await client.chat.postMessage({
        channel: ADMIN_CHANNEL_ID,
        text: `새로운 익명 건의가 접수되었습니다: ${title}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📬 새로운 익명 건의',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*카테고리:*\n${CATEGORY_LABELS[category] || category}`,
              },
              {
                type: 'mrkdwn',
                text: `*접수 시간:*\n${new Date(now).toLocaleString('ko-KR')}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*제목:*\n${title}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*내용:*\n${content}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ID: \`${suggestionId}\``,
              },
            ],
          },
        ],
      });
    }

    // 활동 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'SUGGESTION_SUBMIT',
      userId: 'anonymous',
      details: {
        suggestionId,
        category,
      },
    });

    console.log(`익명 건의 접수: ${suggestionId}`);
  } catch (error) {
    console.error('건의 제출 처리 실패:', error);
  }
}
