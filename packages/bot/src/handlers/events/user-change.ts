/**
 * user_change 이벤트 핸들러
 *
 * 사용자 프로필이 변경되었을 때 이름 형식을 실시간으로 검증합니다.
 */

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { getMember, saveMember, saveLog } from '../../services/db.service.js';
import { sendDirectMessage } from '../../services/slack.service.js';
import { validateDisplayName } from '../../utils/name-validator.js';
import { generateId } from '../../utils/id.js';

// 이름 형식 수정 안내 메시지
const NAME_FIXED_MESSAGE = `이름 형식이 올바르게 수정되었어요! 감사합니다! 🎉

앞으로도 즐거운 동아리 활동 되세요! 😊`;

// 이름 형식 경고 메시지
const NAME_WARNING_MESSAGE = `안녕하세요! 뱁둥이예요 🐕

프로필 이름이 아직 규칙에 맞지 않은 것 같아요.
아래 형식으로 **표시 이름**을 설정해주세요:

\`이름/학과/학번\` (예: 홍길동/컴퓨터공학과/20)

혹시 질문이 있으시면 언제든 물어봐주세요! 😊`;

export async function handleUserChange({
  event,
  client,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'user_change'>): Promise<void> {
  const { user } = event;

  if (!user || !user.id) {
    return;
  }

  // 봇 사용자 무시
  if (user.is_bot) {
    return;
  }

  const displayName = user.profile?.display_name || '';
  const isNameValid = validateDisplayName(displayName);

  try {
    // 기존 회원 정보 조회
    const existingMember = await getMember(user.id);

    if (!existingMember) {
      // 새 회원인 경우 (team_join 이벤트로 이미 처리되었을 수 있음)
      await saveMember({
        slackId: user.id,
        displayName,
        realName: user.profile?.real_name || '',
        email: user.profile?.email,
        isNameValid,
        joinedAt: new Date().toISOString(),
        warningCount: 0,
      });
      return;
    }

    // 이름 형식 상태가 변경된 경우에만 처리
    if (existingMember.isNameValid === isNameValid) {
      // 단순 프로필 업데이트 (이름 형식 상태 변경 없음)
      await saveMember({
        ...existingMember,
        displayName,
        realName: user.profile?.real_name || '',
        email: user.profile?.email,
      });
      return;
    }

    // 이름 형식이 올바르게 수정된 경우
    if (!existingMember.isNameValid && isNameValid) {
      await saveMember({
        ...existingMember,
        displayName,
        realName: user.profile?.real_name || '',
        isNameValid: true,
        warningCount: 0, // 경고 카운트 초기화
      });

      await sendDirectMessage(client, user.id, NAME_FIXED_MESSAGE);

      await saveLog({
        logId: generateId('log'),
        type: 'NAME_VALID',
        userId: user.id,
        details: { displayName },
      });

      console.log(`이름 형식 수정 완료: ${user.id} (${displayName})`);
      return;
    }

    // 올바른 형식에서 잘못된 형식으로 변경된 경우
    if (existingMember.isNameValid && !isNameValid) {
      await saveMember({
        ...existingMember,
        displayName,
        realName: user.profile?.real_name || '',
        isNameValid: false,
      });

      // 즉시 경고 DM 발송
      await sendDirectMessage(client, user.id, NAME_WARNING_MESSAGE);

      await saveLog({
        logId: generateId('log'),
        type: 'NAME_INVALID',
        userId: user.id,
        details: { displayName },
      });

      console.log(`이름 형식 미준수로 변경: ${user.id} (${displayName})`);
    }
  } catch (error) {
    console.error('user_change 처리 실패:', error);
  }
}
