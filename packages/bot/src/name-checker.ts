/**
 * 이름 검사 Lambda 핸들러
 * EventBridge 스케줄러에서 호출되어 이름 형식 미준수 회원 검사
 */

import type { ScheduledHandler } from 'aws-lambda';

export const handler: ScheduledHandler = async (event) => {
  console.log('[NameChecker] Scheduled event:', JSON.stringify(event, null, 2));

  // TODO: 이름 형식 검사 및 경고 DM 발송 구현
  // 현재는 placeholder

  console.log('[NameChecker] Name check completed');
};
