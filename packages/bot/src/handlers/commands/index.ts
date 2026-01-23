/**
 * 슬래시 커맨드 핸들러 등록
 *
 * Slack 슬래시 커맨드를 처리하는 핸들러들을 Bolt 앱에 등록합니다.
 */

import type { App } from '@slack/bolt';
import { handleGuide } from './guide.js';
import { handleSuggestion } from './suggestion.js';

/**
 * 모든 슬래시 커맨드 핸들러를 앱에 등록합니다.
 */
export function registerCommandHandlers(app: App): void {
  // /가이드 - 동아리 활동 가이드
  app.command('/가이드', handleGuide);

  // /익명건의 - 익명 건의사항 제출
  app.command('/익명건의', handleSuggestion);

  console.log('✅ 슬래시 커맨드 핸들러 등록 완료');
}
