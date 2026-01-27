/**
 * 액션 핸들러 등록
 *
 * Slack 인터랙티브 컴포넌트 (버튼, 모달 등)를 처리하는 핸들러들을 등록합니다.
 */

import type { App } from '@slack/bolt';
import { handleSuggestionSubmit } from './suggestion-submit.js';
import { handleEventRSVP } from './event-rsvp.js';
import { handleEventResponse, handleEventResponseInputSubmit } from './event-response.js';

/**
 * 모든 액션 핸들러를 앱에 등록합니다.
 */
export function registerActionHandlers(app: App): void {
  // 익명 건의 모달 제출
  app.view('suggestion_modal', handleSuggestionSubmit);

  // 이벤트 참석/불참 버튼 (레거시)
  app.action('event_rsvp_attend', handleEventRSVP);
  app.action('event_rsvp_absent', handleEventRSVP);

  // 동적 이벤트 응답 버튼 (커스텀 응답 옵션)
  // action_id 패턴: event_response_{optionId}
  app.action(/^event_response_/, handleEventResponse);

  // 이벤트 응답 텍스트 입력 모달 제출
  app.view('event_response_input_modal', handleEventResponseInputSubmit);

  console.log('✅ 액션 핸들러 등록 완료');
}
