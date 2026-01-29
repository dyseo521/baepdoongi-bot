/**
 * 이름 검사 Lambda 핸들러
 * EventBridge 스케줄러에서 3일마다 호출되어 이름 형식 미준수 회원 검사
 *
 * - 이름 형식 미준수 회원 조회
 * - warningCount < 3인 회원만 경고 DM 발송
 * - warningCount 증가
 * - NAME_WARNING_BULK 로그 기록
 */

import type { ScheduledHandler } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { getMembersWithInvalidName, saveMember, saveLog } from './services/db.service.js';
import { sendDirectMessage } from './services/slack.service.js';
import { getSecrets } from './services/secrets.service.js';
import { randomUUID } from 'crypto';

const MAX_WARNING_COUNT = 3;

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

/**
 * 경고 DM 메시지 생성
 */
function getWarningMessage(warningCount: number): string {
  const warningText =
    warningCount === 2
      ? '\n\n⚠️ *이 메시지는 마지막 경고입니다.* 다음부터는 자동 경고가 발송되지 않습니다.'
      : '';

  return `안녕하세요! 👋

IGRUS 슬랙 워크스페이스의 *이름 형식*이 올바르지 않아 안내 드립니다.

📋 *올바른 이름 형식:* \`이름/학과/학번(2자리)\`
예시: \`홍길동/컴퓨터공학과/24\`

현재 표시 이름을 위 형식에 맞게 수정해 주세요.

*이름 변경 방법:*
1. Slack 좌측 상단 워크스페이스 이름 클릭
2. "프로필" 선택
3. "프로필 편집" 클릭
4. "표시 이름" 수정 후 저장

이름 형식을 지켜주시면 동아리 활동 관리에 큰 도움이 됩니다. 감사합니다! 🙏${warningText}`;
}

export const handler: ScheduledHandler = async (event) => {
  console.log('[NameChecker] Scheduled event:', JSON.stringify(event, null, 2));

  const now = new Date().toISOString();

  try {
    // 1. 이름 형식 미준수 회원 조회
    const invalidMembers = await getMembersWithInvalidName();
    console.log(`[NameChecker] Found ${invalidMembers.length} members with invalid names`);

    // 2. warningCount < 3인 회원만 필터링
    const targetMembers = invalidMembers.filter(
      (m) => (m.warningCount || 0) < MAX_WARNING_COUNT
    );
    const skippedCount = invalidMembers.length - targetMembers.length;
    console.log(
      `[NameChecker] Target members: ${targetMembers.length}, Skipped (>= ${MAX_WARNING_COUNT} warnings): ${skippedCount}`
    );

    const client = await getSlackClient();
    let warnedCount = 0;
    let failedCount = 0;

    // 3. 각 회원에게 DM 발송 + warningCount 증가
    for (const member of targetMembers) {
      const newWarningCount = (member.warningCount || 0) + 1;
      const message = getWarningMessage(newWarningCount);

      const success = await sendDirectMessage(client, member.slackId, message);

      if (success) {
        // warningCount 증가
        await saveMember({
          ...member,
          warningCount: newWarningCount,
          lastWarningAt: now,
        });
        warnedCount++;
        console.log(
          `[NameChecker] Warned ${member.slackId} (${member.displayName}), warningCount: ${newWarningCount}`
        );
      } else {
        failedCount++;
        console.error(`[NameChecker] Failed to send DM to ${member.slackId}`);
      }

      // Rate limiting: 1초 간격으로 DM 발송
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 4. 일괄 경고 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'NAME_WARNING_BULK',
      userId: 'system',
      details: {
        totalInvalid: invalidMembers.length,
        warnedCount,
        failedCount,
        skippedCount,
      },
    });

    console.log(
      `[NameChecker] Name check completed. Total: ${invalidMembers.length}, Warned: ${warnedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
    );
  } catch (error) {
    console.error('[NameChecker] Error:', error);

    // 오류 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'SYSTEM_ERROR',
      userId: 'system',
      details: {
        source: 'name-checker',
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
};
