/**
 * 이벤트 및 RSVP 관련 타입 정의
 */

/** Slack 공지 응답 옵션 */
export interface EventResponseOption {
  /** 옵션 ID (예: 'attend', 'absent', 'online', 'late') */
  optionId: string;

  /** 버튼 레이블 */
  label: string;

  /** 이모지 (optional) */
  emoji?: string;

  /** 정렬 순서 */
  order: number;

  /** 텍스트 입력 필요 여부 (기본: false) */
  requiresInput?: boolean;

  /** 입력 필드 레이블 (예: '불참 사유') */
  inputLabel?: string;

  /** 입력 필드 플레이스홀더 */
  inputPlaceholder?: string;
}

/** Slack 공지 정보 */
export interface EventAnnouncement {
  /** Slack 채널 ID */
  channelId: string;

  /** Slack 채널 이름 */
  channelName: string;

  /** Slack 메시지 타임스탬프 */
  messageTs: string;

  /** 응답 옵션 목록 */
  responseOptions: EventResponseOption[];

  /** 공지 일시 */
  announcedAt: string;

  /** 공지 생성자 */
  announcedBy: string;
}

/** 이벤트 정보 */
export interface Event {
  /** 이벤트 고유 ID */
  eventId: string;

  /** 이벤트 제목 */
  title: string;

  /** 이벤트 설명 */
  description: string;

  /** 이벤트 일시 (ISO 8601) */
  datetime: string;

  /** 이벤트 장소 */
  location?: string;

  /** 이벤트 유형 */
  type: EventType;

  /** 이벤트 상태 */
  status: EventStatus;

  /** 생성자 Slack ID */
  createdBy: string;

  /** 생성 일시 (ISO 8601) */
  createdAt: string;

  /** 마지막 업데이트 시간 (ISO 8601) */
  updatedAt?: string;

  /** RSVP 마감 일시 */
  rsvpDeadline?: string;

  /** 최대 참석 인원 */
  maxAttendees?: number;

  /** 설문 요소 */
  surveyFields?: SurveyField[];

  /** 리마인더 발송 여부 */
  reminderSent?: boolean;

  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;

  /** Slack 공지 정보 */
  announcement?: EventAnnouncement;
}

/** 이벤트 유형 */
export type EventType =
  | 'meeting' // 정기 모임
  | 'seminar' // 세미나
  | 'workshop' // 워크샵
  | 'social' // 친목 행사
  | 'other'; // 기타

/** 이벤트 상태 */
export type EventStatus =
  | 'draft' // 초안
  | 'published' // 공개됨
  | 'cancelled' // 취소됨
  | 'completed'; // 완료됨

/** 설문 필드 */
export interface SurveyField {
  /** 필드 ID */
  fieldId: string;

  /** 필드 레이블 */
  label: string;

  /** 필드 타입 */
  type: 'text' | 'select' | 'multiselect' | 'radio';

  /** 선택지 (select, multiselect, radio 타입용) */
  options?: string[];

  /** 필수 여부 */
  required?: boolean;
}

/** RSVP (참석 응답) */
export interface RSVP {
  /** 이벤트 ID */
  eventId: string;

  /** 회원 Slack ID */
  memberId: string;

  /** 참석 상태 */
  status: RSVPStatus;

  /** 응답 일시 (ISO 8601) */
  respondedAt: string;

  /** 설문 응답 */
  surveyResponses?: Record<string, string | string[]>;

  /** 추가 메모 */
  note?: string;

  /** 커스텀 응답 옵션 ID (Slack 공지 응답용) */
  responseOptionId?: string;

  /** 사용자 입력 값 (requiresInput이 true인 옵션 응답 시) */
  inputValue?: string;
}

/** 회원 정보가 포함된 RSVP (API 응답용) */
export interface RSVPWithMember extends RSVP {
  /** 회원 이름 */
  memberName?: string;

  /** 회원 프로필 이미지 URL */
  memberImageUrl?: string;
}

/** RSVP 목록 API 응답 */
export interface RSVPListResponse {
  /** RSVP 목록 */
  rsvps: RSVPWithMember[];

  /** 옵션별 응답 수 요약 */
  summary: Record<string, number>;
}

/** RSVP 상태 */
export type RSVPStatus =
  | 'attending' // 참석
  | 'absent' // 불참
  | 'maybe'; // 미정

/** 이벤트 생성 입력 */
export type CreateEventInput = Pick<
  Event,
  'title' | 'description' | 'datetime' | 'location' | 'type' | 'createdBy'
> &
  Partial<Pick<Event, 'rsvpDeadline' | 'maxAttendees' | 'surveyFields'>>;

/** 이벤트 업데이트 입력 */
export type UpdateEventInput = Partial<
  Omit<Event, 'eventId' | 'createdBy' | 'createdAt'>
>;

/** Slack 채널 정보 */
export interface SlackChannel {
  id: string;
  name: string;
}

/** 이벤트 공지 요청 */
export interface AnnounceEventRequest {
  channelId: string;
  responseOptions: EventResponseOption[];
}

/** 이벤트 공지 응답 */
export interface AnnounceEventResponse {
  success: boolean;
  messageTs: string;
  channelName: string;
}
