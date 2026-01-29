/**
 * Mock 데이터 모듈 진입점
 *
 * 로컬 개발용 더미 데이터를 제공합니다.
 * 프로덕션 빌드 시 이 모듈은 tree-shaking으로 제거됩니다.
 */

// 회원
export { members } from './members';

// 이벤트
export { events, rsvpsByEvent, getEventRSVPs } from './events';

// 건의사항
export { suggestions } from './suggestions';

// 활동 로그
export { logs, generateLogsResponse, logTypes } from './logs';

// 결제
export { submissions, deposits, matches, paymentStats } from './payments';

// 통계
export {
  dashboardStats,
  generateTrends,
  dashboardTrends7,
  dashboardTrends14,
  dashboardTrends30,
} from './stats';

// Slack
export {
  slackChannels,
  bulkDMJobs,
  createBulkDMJob,
  getBulkDMJob,
  getEventDMHistory,
} from './slack';

/**
 * 네트워크 지연 시뮬레이션
 * @param ms 지연 시간 (기본: 200-500ms 랜덤)
 */
export function mockDelay(ms?: number): Promise<void> {
  const delay = ms ?? Math.floor(Math.random() * 300) + 200;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
