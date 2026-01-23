/**
 * /익명건의 슬래시 커맨드 핸들러
 *
 * 익명으로 건의사항을 제출할 수 있는 모달을 표시합니다.
 */

import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

// 건의사항 모달 뷰
const SUGGESTION_MODAL = {
  type: 'modal' as const,
  callback_id: 'suggestion_modal',
  title: {
    type: 'plain_text' as const,
    text: '익명 건의함',
    emoji: true,
  },
  submit: {
    type: 'plain_text' as const,
    text: '제출',
    emoji: true,
  },
  close: {
    type: 'plain_text' as const,
    text: '취소',
    emoji: true,
  },
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '동아리 운영에 대한 건의사항을 익명으로 제출해주세요.\n제출된 내용은 운영진에게만 전달되며, 작성자 정보는 저장되지 않습니다.',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'input',
      block_id: 'category_block',
      element: {
        type: 'static_select',
        placeholder: {
          type: 'plain_text',
          text: '카테고리를 선택하세요',
          emoji: true,
        },
        options: [
          {
            text: {
              type: 'plain_text',
              text: '📋 일반 건의',
              emoji: true,
            },
            value: 'general',
          },
          {
            text: {
              type: 'plain_text',
              text: '📚 스터디/세미나',
              emoji: true,
            },
            value: 'study',
          },
          {
            text: {
              type: 'plain_text',
              text: '🎉 행사/이벤트',
              emoji: true,
            },
            value: 'event',
          },
          {
            text: {
              type: 'plain_text',
              text: '💰 회비/예산',
              emoji: true,
            },
            value: 'budget',
          },
          {
            text: {
              type: 'plain_text',
              text: '🔧 시설/환경',
              emoji: true,
            },
            value: 'facility',
          },
          {
            text: {
              type: 'plain_text',
              text: '💡 기타',
              emoji: true,
            },
            value: 'other',
          },
        ],
        action_id: 'category_select',
      },
      label: {
        type: 'plain_text',
        text: '카테고리',
        emoji: true,
      },
    },
    {
      type: 'input',
      block_id: 'title_block',
      element: {
        type: 'plain_text_input',
        action_id: 'title_input',
        placeholder: {
          type: 'plain_text',
          text: '건의 제목을 입력하세요',
          emoji: true,
        },
        max_length: 100,
      },
      label: {
        type: 'plain_text',
        text: '제목',
        emoji: true,
      },
    },
    {
      type: 'input',
      block_id: 'content_block',
      element: {
        type: 'plain_text_input',
        action_id: 'content_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: '건의 내용을 자세히 작성해주세요',
          emoji: true,
        },
        max_length: 3000,
      },
      label: {
        type: 'plain_text',
        text: '내용',
        emoji: true,
      },
    },
  ],
};

export async function handleSuggestion({
  command,
  ack,
  client,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs): Promise<void> {
  // 3초 내에 응답 확인 필수
  await ack();

  try {
    // 모달 열기
    await client.views.open({
      trigger_id: command.trigger_id,
      view: SUGGESTION_MODAL,
    });

    // 활동 로그 기록 (익명이므로 사용자 ID 기록 안 함)
    await saveLog({
      logId: generateId('log'),
      type: 'COMMAND_SUGGESTION',
      userId: 'anonymous',
      details: {
        channel: command.channel_id,
      },
    });

    console.log(`/익명건의 모달 열림`);
  } catch (error) {
    console.error('/익명건의 처리 실패:', error);
  }
}
