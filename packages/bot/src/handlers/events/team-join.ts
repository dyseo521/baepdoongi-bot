/**
 * team_join 이벤트 핸들러
 *
 * 새로운 멤버가 워크스페이스에 가입했을 때 온보딩 DM을 발송합니다.
 */

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { saveMember, saveLog } from '../../services/db.service.js';
import { sendDirectMessage } from '../../services/slack.service.js';
import { validateDisplayName } from '../../utils/name-validator.js';
import { generateId } from '../../utils/id.js';

// 온보딩 메시지 템플릿
const ONBOARDING_MESSAGE = `안녕하세요! IGRUS에 오신 것을 환영합니다! 🎉

저는 IGRUS의 마스코트이자 도우미 **뱁둥이**예요! 🐕

동아리 활동에 필요한 몇 가지 안내 드릴게요:

*1. 프로필 이름 설정*
슬랙 프로필의 **표시 이름**을 아래 형식으로 설정해주세요:
\`이름/학과/학번\` (예: 홍길동/컴퓨터공학과/20)

*2. 궁금한 점이 있다면*
저를 멘션(@뱁둥이)하면 동아리 관련 질문에 답변해드려요!
예시: "@뱁둥이 동아리 회비가 얼마야?"

*3. 슬래시 커맨드*
• \`/가이드\` - 동아리 활동 가이드 보기
• \`/익명건의\` - 익명으로 건의사항 제출
• 작동이 안되면 엔터를 두번 누르시거나 뒤에 공백을 추가해주세요!

앞으로 즐거운 동아리 활동 되세요! 💪`;

export async function handleTeamJoin({
  event,
  client,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'team_join'>): Promise<void> {
  const { user } = event;

  if (!user || !user.id) {
    console.error('team_join 이벤트에 사용자 정보가 없습니다.');
    return;
  }

  console.log(`새 멤버 가입: ${user.id} (${user.profile?.real_name || 'Unknown'})`);

  try {
    // 이름 형식 검증
    const displayName = user.profile?.display_name || '';
    const isNameValid = validateDisplayName(displayName);

    // 회원 정보 저장
    await saveMember({
      slackId: user.id,
      displayName,
      realName: user.profile?.real_name || '',
      email: user.profile?.email,
      isNameValid,
      joinedAt: new Date().toISOString(),
      warningCount: 0,
    });

    // 온보딩 DM 발송
    await sendDirectMessage(client, user.id, ONBOARDING_MESSAGE);

    // 활동 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'MEMBER_JOIN',
      userId: user.id,
      details: {
        displayName,
        isNameValid,
      },
    });

    console.log(`온보딩 DM 발송 완료: ${user.id}`);
  } catch (error) {
    console.error('team_join 처리 실패:', error);
  }
}
