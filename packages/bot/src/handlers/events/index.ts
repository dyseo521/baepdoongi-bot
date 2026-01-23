/**
 * 이벤트 핸들러 등록
 *
 * Slack 이벤트를 처리하는 핸들러들을 Bolt 앱에 등록합니다.
 */

import type { App } from '@slack/bolt';
import { handleTeamJoin } from './team-join.js';
import { handleUserChange } from './user-change.js';
import { handleAppMention } from './app-mention.js';

/**
 * 모든 이벤트 핸들러를 앱에 등록합니다.
 */
export function registerEventHandlers(app: App): void {
  // 새 멤버 가입 시 온보딩 DM 발송
  app.event('team_join', handleTeamJoin);

  // 사용자 프로필 변경 시 이름 형식 검증
  app.event('user_change', handleUserChange);

  // @뱁둥이 멘션 시 RAG Q&A 처리
  app.event('app_mention', handleAppMention);

  console.log('✅ 이벤트 핸들러 등록 완료');
}
