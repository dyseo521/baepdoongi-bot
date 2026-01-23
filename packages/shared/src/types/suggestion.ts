/**
 * 익명 건의사항 타입 정의
 */

/** 익명 건의사항 */
export interface Suggestion {
  /** 건의사항 고유 ID */
  suggestionId: string;

  /** 카테고리 */
  category: SuggestionCategory;

  /** 제목 */
  title: string;

  /** 내용 */
  content: string;

  /** 상태 */
  status: SuggestionStatus;

  /** 생성 일시 (ISO 8601) */
  createdAt: string;

  /** 처리 일시 (ISO 8601) */
  processedAt?: string;

  /** 처리자 메모 (운영진용) */
  adminNote?: string;
}

/** 건의사항 카테고리 */
export type SuggestionCategory =
  | 'general' // 일반 건의
  | 'study' // 스터디/세미나
  | 'event' // 행사/이벤트
  | 'budget' // 회비/예산
  | 'facility' // 시설/환경
  | 'other'; // 기타

/** 건의사항 상태 */
export type SuggestionStatus =
  | 'pending' // 대기 중
  | 'in_review' // 검토 중
  | 'resolved' // 처리 완료
  | 'rejected'; // 반려

/** 카테고리 라벨 */
export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  general: '📋 일반 건의',
  study: '📚 스터디/세미나',
  event: '🎉 행사/이벤트',
  budget: '💰 회비/예산',
  facility: '🔧 시설/환경',
  other: '💡 기타',
};

/** 상태 라벨 */
export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: '⏳ 대기 중',
  in_review: '🔍 검토 중',
  resolved: '✅ 처리 완료',
  rejected: '❌ 반려',
};

/** 건의사항 생성 입력 */
export type CreateSuggestionInput = Pick<
  Suggestion,
  'category' | 'title' | 'content'
>;

/** 건의사항 업데이트 입력 */
export type UpdateSuggestionInput = Partial<
  Pick<Suggestion, 'status' | 'adminNote'>
>;
