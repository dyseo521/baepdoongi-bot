/**
 * API 관련 공통 타입 정의
 */

/** API 응답 기본 형식 */
export interface ApiResponse<T> {
  /** 성공 여부 */
  success: boolean;

  /** 응답 데이터 */
  data?: T;

  /** 에러 메시지 */
  error?: string;

  /** 에러 코드 */
  errorCode?: string;
}

/** 페이지네이션 요청 */
export interface PaginationRequest {
  /** 페이지 번호 (1부터 시작) */
  page?: number;

  /** 페이지 크기 */
  limit?: number;

  /** 정렬 필드 */
  sortBy?: string;

  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
}

/** 페이지네이션 응답 */
export interface PaginatedResponse<T> {
  /** 데이터 목록 */
  items: T[];

  /** 전체 항목 수 */
  total: number;

  /** 현재 페이지 */
  page: number;

  /** 페이지 크기 */
  limit: number;

  /** 전체 페이지 수 */
  totalPages: number;

  /** 다음 페이지 존재 여부 */
  hasNext: boolean;

  /** 이전 페이지 존재 여부 */
  hasPrev: boolean;
}

/** 에러 코드 */
export type ErrorCode =
  | 'UNAUTHORIZED' // 인증 필요
  | 'FORBIDDEN' // 권한 없음
  | 'NOT_FOUND' // 리소스 없음
  | 'VALIDATION_ERROR' // 유효성 검증 실패
  | 'INTERNAL_ERROR' // 서버 오류
  | 'RATE_LIMITED' // 요청 제한 초과
  | 'SLACK_API_ERROR' // Slack API 오류
  | 'BEDROCK_ERROR'; // Bedrock 오류

/** 대시보드 통계 */
export interface DashboardStats {
  /** 전체 회원 수 */
  totalMembers: number;

  /** 이름 형식 준수 회원 수 */
  validNameMembers: number;

  /** 이번 달 신규 가입 수 */
  newMembersThisMonth: number;

  /** 활성 이벤트 수 */
  activeEvents: number;

  /** 미처리 건의사항 수 */
  pendingSuggestions: number;

  /** 오늘 RAG 질문 수 */
  ragQueriesToday: number;
}
