/**
 * /가이드 슬래시 커맨드 핸들러
 *
 * 동아리 활동 가이드를 보여줍니다.
 */

import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

// 가이드 메시지 Block Kit
const GUIDE_BLOCKS = [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: '📚 IGRUS 동아리 가이드',
      emoji: true,
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'IGRUS 동아리 활동에 오신 것을 환영합니다! 아래 가이드를 참고해주세요.',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*🏷️ 프로필 설정*\n슬랙 프로필의 표시 이름을 `이름/학과/학번` 형식으로 설정해주세요.\n예시: `김아그/컴퓨터공학과/26`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*💬 채널 소개*\n• `#0-공지` - 동아리 주요 소식을 알리는 채널\n• `#1-잡담` - 자유로운 대화\n• `#1-정보공유` - 교내 소식, 세미나 소식 등 유용한 소식 공유',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*🤖 뱁둥이 사용법*\n저를 멘션하면 동아리 관련 질문에 답변해드려요!\n예시: `@뱁둥이 동아리 회비가 얼마야?`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*📝 슬래시 커맨드*\n• `/가이드` - 이 가이드 보기\n• `/익명건의` - 익명으로 건의사항 제출',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '💡 더 궁금한 점이 있다면 언제든 @뱁둥이를 불러주세요!',
      },
    ],
  },
];

export async function handleGuide({
  command,
  ack,
  respond,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs): Promise<void> {
  // 3초 내에 응답 확인 필수
  await ack();

  try {
    // 가이드 메시지 전송 (ephemeral - 본인에게만 보임)
    await respond({
      blocks: GUIDE_BLOCKS,
      response_type: 'ephemeral',
    });

    // 활동 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'COMMAND_GUIDE',
      userId: command.user_id,
      details: {
        channel: command.channel_id,
      },
    });

    console.log(`/가이드 커맨드 실행: ${command.user_id}`);
  } catch (error) {
    console.error('/가이드 처리 실패:', error);

    await respond({
      text: '죄송해요, 가이드를 불러오는 중에 문제가 발생했어요. 😢',
      response_type: 'ephemeral',
    });
  }
}
