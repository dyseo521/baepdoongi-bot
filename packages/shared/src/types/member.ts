/**
 * 회원 관련 타입 정의
 */

/** 회원 정보 */
export interface Member {
  /** Slack 사용자 ID */
  slackId: string;

  /** Slack 표시 이름 */
  displayName: string;

  /** 실명 */
  realName: string;

  /** 이메일 */
  email?: string;

  /** 프로필 이미지 URL */
  imageUrl?: string;

  /** 이름 형식 준수 여부 */
  isNameValid: boolean;

  /** 이름 형식 경고 횟수 */
  warningCount: number;

  /** 마지막 경고 발송 시간 */
  lastWarningAt?: string;

  /** 가입 일시 (ISO 8601) */
  joinedAt: string;

  /** 마지막 업데이트 시간 (ISO 8601) */
  updatedAt?: string;

  /** 회원 역할 */
  role?: MemberRole;

  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

/** 회원 역할 */
export type MemberRole = 'admin' | 'staff' | 'member';

/** 회원 생성 입력 */
export type CreateMemberInput = Pick<
  Member,
  'slackId' | 'displayName' | 'realName' | 'email' | 'isNameValid'
>;

/** 회원 업데이트 입력 */
export type UpdateMemberInput = Partial<Omit<Member, 'slackId' | 'joinedAt'>>;
