/**
 * 활동 로그 및 RAG 세션 타입 정의
 */

/** 활동 로그 */
export interface ActivityLog {
  /** 로그 고유 ID */
  logId: string;

  /** 로그 유형 */
  type: LogType;

  /** 관련 사용자 Slack ID (또는 'system' / 'dashboard') */
  userId: string;

  /** 대상 사용자 Slack ID (DM 수신자 등) */
  targetUserId?: string;

  /** 관련 이벤트 ID */
  eventId?: string;

  /** 로그 상세 정보 */
  details?: Record<string, unknown>;

  /** 생성 일시 (ISO 8601) */
  createdAt: string;
}

/** 로그 유형 */
export type LogType =
  // 회원 관련
  | 'MEMBER_JOIN' // 신규 가입 (team_join 이벤트)
  | 'MEMBER_LEAVE' // 워크스페이스 탈퇴
  | 'MEMBER_SYNC' // 회원 목록 동기화
  | 'MEMBER_PROFILE_UPDATE' // 프로필 업데이트
  | 'NAME_VALID' // 이름 형식 수정 완료
  | 'NAME_INVALID' // 이름 형식 미준수 감지
  | 'NAME_WARNING_SENT' // 이름 형식 경고 DM 발송
  | 'NAME_WARNING_BULK' // 이름 경고 일괄 발송
  // 이벤트 관련
  | 'EVENT_CREATE' // 이벤트 생성
  | 'EVENT_UPDATE' // 이벤트 수정
  | 'EVENT_DELETE' // 이벤트 삭제
  | 'EVENT_ANNOUNCE' // 이벤트 Slack 공지
  | 'EVENT_ANNOUNCE_UPDATE' // 공지 메시지 수정
  | 'EVENT_RSVP' // 이벤트 참석 응답
  | 'EVENT_REMINDER' // 이벤트 리마인더 발송
  // 슬래시 커맨드 관련
  | 'COMMAND_GUIDE' // /가이드 사용
  | 'COMMAND_SUGGESTION' // /익명건의 모달 열기
  | 'COMMAND_OTHER' // 기타 커맨드
  // 건의사항
  | 'SUGGESTION_SUBMIT' // 건의사항 제출
  | 'SUGGESTION_READ' // 건의사항 확인 처리
  | 'SUGGESTION_REPLY' // 건의사항 답변
  // DM 관련
  | 'DM_SENT' // DM 전송 (일반)
  | 'DM_WELCOME' // 환영 DM 전송
  | 'DM_ERROR' // DM 전송 실패
  | 'BULK_DM_START' // 단체 DM 시작
  | 'BULK_DM_COMPLETE' // 단체 DM 완료
  | 'BULK_DM_FAILED' // 단체 DM 실패
  // RAG 관련
  | 'RAG_QUERY' // RAG 질문
  | 'RAG_RESPONSE' // RAG 응답 완료
  | 'RAG_ERROR' // RAG 오류
  // 결제/가입 관련
  | 'SUBMISSION_RECEIVE' // 지원서 수신
  | 'DEPOSIT_RECEIVE' // 입금 수신
  | 'PAYMENT_MATCH_AUTO' // 자동 매칭 성공
  | 'PAYMENT_MATCH_MANUAL' // 수동 매칭
  | 'PAYMENT_MATCH_FAILED' // 매칭 실패
  | 'SUBMISSION_DELETE' // 지원서 삭제
  | 'DEPOSIT_DELETE' // 입금 삭제
  | 'PAYMENT_UNMATCH' // 매칭 해제
  | 'INVITE_EMAIL_SENT' // 초대 이메일 발송
  | 'INVITE_EMAIL_FAILED' // 이메일 발송 실패
  | 'SUBMISSION_JOINED' // Slack 가입 완료
  // 시스템/설정 관련
  | 'SETTINGS_UPDATE' // 설정 변경
  | 'SYSTEM_ERROR' // 시스템 오류
  | 'API_ERROR'; // API 오류

/** 로그 유형별 한글 라벨 */
export const LOG_TYPE_LABELS: Record<LogType, string> = {
  // 회원 관련
  MEMBER_JOIN: '신규 가입',
  MEMBER_LEAVE: '워크스페이스 탈퇴',
  MEMBER_SYNC: '회원 동기화',
  MEMBER_PROFILE_UPDATE: '프로필 업데이트',
  NAME_VALID: '이름 형식 수정',
  NAME_INVALID: '이름 형식 미준수',
  NAME_WARNING_SENT: '이름 경고 DM',
  NAME_WARNING_BULK: '이름 경고 일괄 발송',
  // 이벤트 관련
  EVENT_CREATE: '이벤트 생성',
  EVENT_UPDATE: '이벤트 수정',
  EVENT_DELETE: '이벤트 삭제',
  EVENT_ANNOUNCE: '이벤트 공지',
  EVENT_ANNOUNCE_UPDATE: '공지 수정',
  EVENT_RSVP: '참석 응답',
  EVENT_REMINDER: '리마인더 발송',
  // 슬래시 커맨드 관련
  COMMAND_GUIDE: '/가이드 사용',
  COMMAND_SUGGESTION: '/익명건의 사용',
  COMMAND_OTHER: '커맨드 사용',
  // 건의사항
  SUGGESTION_SUBMIT: '건의사항 제출',
  SUGGESTION_READ: '건의사항 확인',
  SUGGESTION_REPLY: '건의사항 답변',
  // DM 관련
  DM_SENT: 'DM 전송',
  DM_WELCOME: '환영 DM',
  DM_ERROR: 'DM 전송 실패',
  BULK_DM_START: '단체 DM 시작',
  BULK_DM_COMPLETE: '단체 DM 완료',
  BULK_DM_FAILED: '단체 DM 실패',
  // RAG 관련
  RAG_QUERY: 'RAG 질문',
  RAG_RESPONSE: 'RAG 응답',
  RAG_ERROR: 'RAG 오류',
  // 결제/가입 관련
  SUBMISSION_RECEIVE: '지원서 수신',
  DEPOSIT_RECEIVE: '입금 수신',
  PAYMENT_MATCH_AUTO: '자동 매칭',
  PAYMENT_MATCH_MANUAL: '수동 매칭',
  PAYMENT_MATCH_FAILED: '매칭 실패',
  SUBMISSION_DELETE: '지원서 삭제',
  DEPOSIT_DELETE: '입금 삭제',
  PAYMENT_UNMATCH: '매칭 해제',
  INVITE_EMAIL_SENT: '초대 이메일 발송',
  INVITE_EMAIL_FAILED: '이메일 발송 실패',
  SUBMISSION_JOINED: 'Slack 가입 완료',
  // 시스템/설정 관련
  SETTINGS_UPDATE: '설정 변경',
  SYSTEM_ERROR: '시스템 오류',
  API_ERROR: 'API 오류',
};

/** RAG 세션 */
export interface RagSession {
  /** 세션 ID */
  sessionId: string;

  /** Bedrock 세션 ID */
  bedrockSessionId?: string;

  /** 사용자 Slack ID */
  userId: string;

  /** 마지막 질문 */
  lastQuery: string;

  /** 마지막 응답 */
  lastResponse: string;

  /** 생성 일시 (ISO 8601) */
  createdAt?: string;
}

/** 로그 생성 입력 */
export type CreateLogInput = Pick<ActivityLog, 'type' | 'userId' | 'details'>;
