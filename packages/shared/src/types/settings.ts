/**
 * 시스템 설정 타입 정의
 */

/** 시스템 설정 */
export interface Settings {
  /** 자동 초대 이메일 발송 여부 */
  autoSendInviteEmail: boolean;

  /** 마지막 업데이트 시각 (ISO 8601) */
  updatedAt?: string;

  /** 마지막 업데이트 수행자 */
  updatedBy?: string;
}

/** 기본 설정 값 */
export const DEFAULT_SETTINGS: Settings = {
  autoSendInviteEmail: false,
};
