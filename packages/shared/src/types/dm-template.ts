/**
 * DM 템플릿 및 단체 DM 관련 타입 정의
 */

/** DM 템플릿 */
export interface DMTemplate {
  /** 템플릿 ID */
  templateId: string;

  /** 템플릿 이름 */
  name: string;

  /** 템플릿 설명 */
  description: string;

  /** 메시지 템플릿 ({{변수}} 형식 지원) */
  messageTemplate: string;
}

/** 기본 DM 템플릿 목록 */
export const DM_TEMPLATES: DMTemplate[] = [
  {
    templateId: 'remind',
    name: '리마인드 DM',
    description: '행사 참석 리마인더',
    messageTemplate: `안녕하세요! 🙌

*{{eventTitle}}* 행사가 곧 시작됩니다.

📅 일시: {{datetime}}
📍 장소: {{location}}

행사장에서 뵙겠습니다! 😊`,
  },
  {
    templateId: 'additional',
    name: '추가 공지 DM',
    description: '추가 안내사항 전달',
    messageTemplate: `안녕하세요! 📢

*{{eventTitle}}* 관련 추가 안내드립니다.

{{customMessage}}

감사합니다! 🙏`,
  },
  {
    templateId: 'custom',
    name: '직접 입력',
    description: '메시지 직접 작성',
    messageTemplate: '',
  },
];

/** 단체 DM 요청 */
export interface BulkDMRequest {
  /** 수신 대상 사용자 ID 목록 */
  userIds: string[];

  /** 템플릿 ID */
  templateId: string;

  /** 커스텀 메시지 (템플릿에서 {{customMessage}} 치환) */
  customMessage?: string;
}

/** 단체 DM 작업 상태 */
export type BulkDMJobStatus =
  | 'queued' // 대기 중
  | 'processing' // 처리 중
  | 'completed' // 완료
  | 'failed'; // 실패

/** 단체 DM 오류 정보 */
export interface BulkDMError {
  /** 실패한 사용자 ID */
  userId: string;

  /** 오류 메시지 */
  error: string;
}

/** 단체 DM 작업 */
export interface BulkDMJob {
  /** 작업 ID */
  jobId: string;

  /** 관련 이벤트 ID */
  eventId: string;

  /** 템플릿 ID */
  templateId: string;

  /** 커스텀 메시지 */
  customMessage?: string;

  /** 대상 사용자 ID 목록 */
  userIds: string[];

  /** 전체 대상 수 */
  totalCount: number;

  /** 발송 완료 수 */
  sentCount: number;

  /** 발송 실패 수 */
  failedCount: number;

  /** 작업 상태 */
  status: BulkDMJobStatus;

  /** 생성 일시 (ISO 8601) */
  createdAt: string;

  /** 완료 일시 (ISO 8601) */
  completedAt?: string;

  /** 오류 목록 */
  errors?: BulkDMError[];
}

/** 단체 DM 작업 생성 응답 */
export interface BulkDMJobResponse {
  /** 작업 ID */
  jobId: string;

  /** 전체 대상 수 */
  totalCount: number;

  /** 작업 상태 */
  status: BulkDMJobStatus;
}
