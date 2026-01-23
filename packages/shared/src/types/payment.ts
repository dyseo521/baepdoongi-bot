/**
 * 결제(회비 납부) 관련 타입 정의
 */

/** 지원서 상태 */
export type SubmissionStatus = 'pending' | 'matched' | 'invited' | 'joined';

/** 입금 상태 */
export type DepositStatus = 'pending' | 'matched' | 'expired';

/** 매칭 결과 유형 */
export type MatchResultType = 'auto' | 'manual' | 'failed';

/** 구글 폼 지원서 */
export interface Submission {
  /** 지원서 고유 ID */
  submissionId: string;

  /** 이름 */
  name: string;

  /** 학번 (8자리) */
  studentId: string;

  /** 이메일 */
  email: string;

  /** 학과 */
  department?: string;

  /** 전화번호 */
  phone?: string;

  /** 현재 상태 */
  status: SubmissionStatus;

  /** 폼 제출 시각 (ISO 8601) */
  submittedAt: string;

  /** 매칭된 입금 ID (있을 경우) */
  matchedDepositId?: string;

  /** 매칭 시각 (ISO 8601) */
  matchedAt?: string;

  /** 초대 이메일 발송 시각 (ISO 8601) */
  invitedAt?: string;

  /** Slack 가입 완료 시각 (ISO 8601) */
  joinedAt?: string;

  /** 레코드 생성 시각 (ISO 8601) */
  createdAt: string;

  /** 레코드 업데이트 시각 (ISO 8601) */
  updatedAt?: string;

  /** 추가 메타데이터 (구글 폼의 추가 필드들) */
  metadata?: Record<string, unknown>;
}

/** 입금 알림 */
export interface Deposit {
  /** 입금 고유 ID */
  depositId: string;

  /** 입금자명 (토스 알림에서 파싱) */
  depositorName: string;

  /** 입금액 (원) */
  amount: number;

  /** 입금 시각 (ISO 8601) */
  timestamp: string;

  /** 현재 상태 */
  status: DepositStatus;

  /** 원본 알림 텍스트 */
  rawNotification: string;

  /** 매칭된 지원서 ID (있을 경우) */
  matchedSubmissionId?: string;

  /** 매칭 시각 (ISO 8601) */
  matchedAt?: string;

  /** 레코드 생성 시각 (ISO 8601) */
  createdAt: string;

  /** 레코드 업데이트 시각 (ISO 8601) */
  updatedAt?: string;
}

/** 매칭 이력 */
export interface Match {
  /** 매칭 고유 ID */
  matchId: string;

  /** 지원서 ID */
  submissionId: string;

  /** 입금 ID */
  depositId: string;

  /** 매칭 결과 유형 */
  resultType: MatchResultType;

  /** 매칭 신뢰도 점수 (0-100) */
  confidence: number;

  /** 매칭 근거 */
  reason: string;

  /** 폼 제출과 입금 간 시간 차이 (분) */
  timeDifferenceMinutes: number;

  /** 수동 매칭 시 관리자 ID */
  matchedBy?: string;

  /** 매칭 시각 (ISO 8601) */
  createdAt: string;
}

/** Tasker 웹훅 요청 */
export interface TossBankWebhookRequest {
  /** 웹훅 시크릿 */
  secret: string;

  /** 알림 정보 */
  notification: {
    /** 알림 텍스트 (예: "홍길동님이 30,000원을 입금했습니다") */
    text: string;

    /** 알림 수신 시각 (ISO 8601) */
    timestamp: string;
  };
}

/** 매칭 알고리즘 입력 */
export interface MatchingInput {
  /** 입금자명 */
  depositorName: string;

  /** 입금 시각 */
  depositTimestamp: Date;

  /** 입금액 */
  amount: number;
}

/** 매칭 알고리즘 결과 */
export interface MatchingResult {
  /** 성공 여부 */
  success: boolean;

  /** 매칭 유형 (자동/수동 필요) */
  type: 'auto' | 'manual_required';

  /** 매칭된 지원서 (있을 경우) */
  submission?: Submission;

  /** 매칭 신뢰도 점수 (0-100) */
  confidence: number;

  /** 매칭 근거/실패 사유 */
  reason: string;

  /** 시간 차이 (분) */
  timeDifferenceMinutes?: number;

  /** 수동 매칭 필요 시 후보 목록 */
  candidates?: Submission[];
}

/** 지원서 생성 입력 */
export type CreateSubmissionInput = Pick<
  Submission,
  'name' | 'studentId' | 'email' | 'department' | 'phone' | 'metadata'
>;

/** 입금 생성 입력 */
export type CreateDepositInput = Pick<
  Deposit,
  'depositorName' | 'amount' | 'timestamp' | 'rawNotification'
>;

/** 결제 시스템 통계 */
export interface PaymentStats {
  /** 총 지원서 수 */
  totalSubmissions: number;

  /** 상태별 지원서 수 */
  submissionsByStatus: Record<SubmissionStatus, number>;

  /** 총 입금 수 */
  totalDeposits: number;

  /** 상태별 입금 수 */
  depositsByStatus: Record<DepositStatus, number>;

  /** 자동 매칭률 (%) */
  autoMatchRate: number;

  /** 총 입금액 */
  totalAmount: number;
}
