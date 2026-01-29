/**
 * 결제/매칭 서비스
 *
 * 지원서-입금 매칭 알고리즘 및 결제 관련 비즈니스 로직을 담당합니다.
 */

import type {
  Submission,
  Deposit,
  Match,
  MatchingResult,
  MatchingInput,
  PaymentStats,
} from '@baepdoongi/shared';
import {
  saveSubmission,
  saveDeposit,
  saveMatch,
  getSubmission,
  getDeposit,
  listSubmissions,
  listDeposits,
  listSubmissionsByStatus,
  listDepositsByStatus,
  updateSubmissionStatus,
  updateDepositStatus,
} from './db.service.js';
import { saveLog } from './db.service.js';
import { sendInviteEmail } from './email.service.js';
import { randomUUID } from 'crypto';

// 매칭 설정
const MATCHING_CONFIG = {
  /** 이름 완전 일치 시 신뢰도 */
  EXACT_NAME_MATCH_CONFIDENCE: 90,
  /** 이름 부분 일치 시 기본 신뢰도 */
  PARTIAL_NAME_MATCH_CONFIDENCE: 60,
  /** 자동 매칭 임계값 */
  AUTO_MATCH_THRESHOLD: 80,
  /** 매칭 고려 최대 시간 차이 (분) */
  MAX_TIME_DIFF_MINUTES: 60 * 24 * 7, // 7일
  /** 시간 가까움에 따른 보너스 (1시간 이내) */
  TIME_BONUS_1H: 10,
  /** 시간 가까움에 따른 보너스 (24시간 이내) */
  TIME_BONUS_24H: 5,
};

/**
 * 입금 정보를 기반으로 지원서 자동 매칭을 시도합니다.
 */
export async function tryAutoMatch(input: MatchingInput): Promise<MatchingResult> {
  const { depositorName, depositTimestamp, amount } = input;

  // 대기 중인 지원서 목록 조회
  const pendingSubmissions = await listSubmissionsByStatus('pending');

  if (pendingSubmissions.length === 0) {
    return {
      success: false,
      type: 'manual_required',
      confidence: 0,
      reason: '대기 중인 지원서가 없습니다.',
      candidates: [],
    };
  }

  // 매칭 후보 점수 계산
  const candidates: Array<{
    submission: Submission;
    confidence: number;
    reason: string;
    timeDiff: number;
  }> = [];

  for (const submission of pendingSubmissions) {
    const { confidence, reason, timeDiff } = calculateMatchScore(
      submission,
      depositorName,
      depositTimestamp
    );

    if (confidence > 0) {
      candidates.push({
        submission,
        confidence,
        reason,
        timeDiff,
      });
    }
  }

  // 신뢰도 순으로 정렬
  candidates.sort((a, b) => b.confidence - a.confidence);

  // 최고 후보 확인
  const bestMatch = candidates[0];

  if (!bestMatch) {
    return {
      success: false,
      type: 'manual_required',
      confidence: 0,
      reason: '일치하는 지원서를 찾을 수 없습니다.',
      candidates: pendingSubmissions.slice(0, 5), // 상위 5개 후보 반환
    };
  }

  // 자동 매칭 가능 여부 확인
  if (bestMatch.confidence >= MATCHING_CONFIG.AUTO_MATCH_THRESHOLD) {
    return {
      success: true,
      type: 'auto',
      submission: bestMatch.submission,
      confidence: bestMatch.confidence,
      reason: bestMatch.reason,
      timeDifferenceMinutes: bestMatch.timeDiff,
    };
  }

  // 수동 확인 필요
  return {
    success: false,
    type: 'manual_required',
    confidence: bestMatch.confidence,
    reason: `신뢰도 부족 (${bestMatch.confidence}% < ${MATCHING_CONFIG.AUTO_MATCH_THRESHOLD}%)`,
    submission: bestMatch.submission,
    timeDifferenceMinutes: bestMatch.timeDiff,
    candidates: candidates.slice(0, 5).map((c) => c.submission),
  };
}

/**
 * 지원서와 입금자명 간의 매칭 점수를 계산합니다.
 */
function calculateMatchScore(
  submission: Submission,
  depositorName: string,
  depositTimestamp: Date
): { confidence: number; reason: string; timeDiff: number } {
  let confidence = 0;
  const reasons: string[] = [];

  // 이름 정규화 (공백, 특수문자 제거)
  const normalizedDepositor = normalizeKoreanName(depositorName);
  const normalizedSubmission = normalizeKoreanName(submission.name);

  // 이름 매칭
  if (normalizedDepositor === normalizedSubmission) {
    // 완전 일치
    confidence = MATCHING_CONFIG.EXACT_NAME_MATCH_CONFIDENCE;
    reasons.push('이름 완전 일치');
  } else if (
    normalizedDepositor.includes(normalizedSubmission) ||
    normalizedSubmission.includes(normalizedDepositor)
  ) {
    // 부분 일치 (입금자명에 숫자가 포함된 경우 등)
    confidence = MATCHING_CONFIG.PARTIAL_NAME_MATCH_CONFIDENCE;
    reasons.push('이름 부분 일치');
  } else {
    // 일치하지 않음
    return { confidence: 0, reason: '이름 불일치', timeDiff: 0 };
  }

  // 시간 차이 계산
  const submissionTime = new Date(submission.submittedAt);
  const timeDiffMs = Math.abs(depositTimestamp.getTime() - submissionTime.getTime());
  const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

  // 시간 차이가 너무 크면 제외
  if (timeDiffMinutes > MATCHING_CONFIG.MAX_TIME_DIFF_MINUTES) {
    return { confidence: 0, reason: '시간 차이 초과', timeDiff: timeDiffMinutes };
  }

  // 시간 보너스
  if (timeDiffMinutes <= 60) {
    confidence += MATCHING_CONFIG.TIME_BONUS_1H;
    reasons.push(`시간 차이 ${timeDiffMinutes}분 (1시간 이내)`);
  } else if (timeDiffMinutes <= 60 * 24) {
    confidence += MATCHING_CONFIG.TIME_BONUS_24H;
    reasons.push(`시간 차이 ${Math.floor(timeDiffMinutes / 60)}시간 (24시간 이내)`);
  } else {
    reasons.push(`시간 차이 ${Math.floor(timeDiffMinutes / (60 * 24))}일`);
  }

  return {
    confidence: Math.min(confidence, 100),
    reason: reasons.join(', '),
    timeDiff: timeDiffMinutes,
  };
}

/**
 * 한글 이름을 정규화합니다.
 */
function normalizeKoreanName(name: string): string {
  return name
    .replace(/\s+/g, '') // 공백 제거
    .replace(/[0-9]/g, '') // 숫자 제거 (입금자명에 학번 포함 시)
    .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318Fa-zA-Z]/g, '') // 한글/영문만
    .toLowerCase();
}

/**
 * 수동으로 지원서와 입금을 매칭합니다.
 */
export async function manualMatch(
  submissionId: string,
  depositId: string,
  matchedBy: string
): Promise<Match | null> {
  const submission = await getSubmission(submissionId);
  const deposit = await getDeposit(depositId);

  if (!submission || !deposit) {
    console.error('지원서 또는 입금 정보를 찾을 수 없습니다.');
    return null;
  }

  if (submission.status !== 'pending') {
    console.error('이미 처리된 지원서입니다.');
    return null;
  }

  if (deposit.status !== 'pending') {
    console.error('이미 매칭된 입금입니다.');
    return null;
  }

  const now = new Date().toISOString();
  const matchId = `match_${randomUUID()}`;

  // 시간 차이 계산
  const timeDiff = Math.abs(
    new Date(deposit.timestamp).getTime() - new Date(submission.submittedAt).getTime()
  );
  const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));

  // 매칭 이력 생성
  const match: Match = {
    matchId,
    submissionId,
    depositId,
    resultType: 'manual',
    confidence: 100, // 수동 매칭은 100% 신뢰
    reason: `수동 매칭 (by ${matchedBy})`,
    timeDifferenceMinutes: timeDiffMinutes,
    matchedBy,
    createdAt: now,
  };

  await saveMatch(match);

  // 지원서 상태 업데이트
  await updateSubmissionStatus(submissionId, 'matched', {
    matchedDepositId: depositId,
    matchedAt: now,
  });

  // 입금 상태 업데이트
  await updateDepositStatus(depositId, 'matched', {
    matchedSubmissionId: submissionId,
    matchedAt: now,
  });

  // 로그 기록
  await saveLog({
    logId: `log_${randomUUID()}`,
    type: 'PAYMENT_MATCH_MANUAL',
    userId: matchedBy,
    details: {
      matchId,
      submissionId,
      depositId,
      submissionName: submission.name,
      depositorName: deposit.depositorName,
      amount: deposit.amount,
    },
  });

  return match;
}

/**
 * 자동 매칭을 수행하고 결과를 저장합니다.
 */
export async function performAutoMatch(deposit: Deposit): Promise<Match | null> {
  const matchResult = await tryAutoMatch({
    depositorName: deposit.depositorName,
    depositTimestamp: new Date(deposit.timestamp),
    amount: deposit.amount,
  });

  if (!matchResult.success || !matchResult.submission) {
    // 매칭 실패 로그
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'PAYMENT_MATCH_FAILED',
      userId: 'system',
      details: {
        depositId: deposit.depositId,
        depositorName: deposit.depositorName,
        reason: matchResult.reason,
        candidates: matchResult.candidates?.map((c) => c.name).slice(0, 3),
      },
    });
    return null;
  }

  const now = new Date().toISOString();
  const matchId = `match_${randomUUID()}`;

  // 매칭 이력 생성
  const match: Match = {
    matchId,
    submissionId: matchResult.submission.submissionId,
    depositId: deposit.depositId,
    resultType: 'auto',
    confidence: matchResult.confidence,
    reason: matchResult.reason,
    timeDifferenceMinutes: matchResult.timeDifferenceMinutes || 0,
    createdAt: now,
  };

  await saveMatch(match);

  // 지원서 상태 업데이트
  await updateSubmissionStatus(matchResult.submission.submissionId, 'matched', {
    matchedDepositId: deposit.depositId,
    matchedAt: now,
  });

  // 입금 상태 업데이트
  await updateDepositStatus(deposit.depositId, 'matched', {
    matchedSubmissionId: matchResult.submission.submissionId,
    matchedAt: now,
  });

  // 로그 기록
  await saveLog({
    logId: `log_${randomUUID()}`,
    type: 'PAYMENT_MATCH_AUTO',
    userId: 'system',
    details: {
      matchId,
      submissionId: matchResult.submission.submissionId,
      depositId: deposit.depositId,
      confidence: matchResult.confidence,
      reason: matchResult.reason,
      submissionName: matchResult.submission.name,
      depositorName: deposit.depositorName,
    },
  });

  return match;
}

/**
 * 매칭된 지원서에 초대 이메일을 발송합니다.
 */
export async function sendSubmissionInvite(
  submissionId: string,
  inviteLink: string
): Promise<boolean> {
  const submission = await getSubmission(submissionId);

  if (!submission) {
    console.error('지원서를 찾을 수 없습니다.');
    return false;
  }

  if (submission.status !== 'matched' && submission.status !== 'invited') {
    console.error('매칭되지 않은 지원서입니다.');
    return false;
  }

  if (!submission.email) {
    console.error('이메일 주소가 없습니다.');
    return false;
  }

  const success = await sendInviteEmail({
    toEmail: submission.email,
    name: submission.name,
    inviteLink,
  });

  const now = new Date().toISOString();

  if (success) {
    // 상태 업데이트
    await updateSubmissionStatus(submissionId, 'invited', {
      invitedAt: now,
      emailSent: true,
      emailSentAt: now,
    });

    // 성공 로그
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'INVITE_EMAIL_SENT',
      userId: 'system',
      details: {
        submissionId,
        email: submission.email,
        name: submission.name,
      },
    });
  } else {
    // 실패 로그
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'INVITE_EMAIL_FAILED',
      userId: 'system',
      details: {
        submissionId,
        email: submission.email,
        name: submission.name,
      },
    });
  }

  return success;
}

/**
 * 결제 통계를 조회합니다.
 */
export async function getPaymentStats(): Promise<PaymentStats> {
  const [submissions, deposits] = await Promise.all([
    listSubmissions(),
    listDeposits(),
  ]);

  const submissionsByStatus = {
    pending: 0,
    matched: 0,
    invited: 0,
    joined: 0,
  };

  const depositsByStatus = {
    pending: 0,
    matched: 0,
    expired: 0,
  };

  let autoMatchCount = 0;
  let totalAmount = 0;

  for (const sub of submissions) {
    submissionsByStatus[sub.status]++;
  }

  for (const dep of deposits) {
    depositsByStatus[dep.status]++;
    totalAmount += dep.amount;
  }

  // 자동 매칭률 계산 (매칭된 것 중 자동 매칭 비율)
  const totalMatched = submissionsByStatus.matched + submissionsByStatus.invited + submissionsByStatus.joined;
  const autoMatchRate = totalMatched > 0 ? Math.round((autoMatchCount / totalMatched) * 100) : 0;

  return {
    totalSubmissions: submissions.length,
    submissionsByStatus,
    totalDeposits: deposits.length,
    depositsByStatus,
    autoMatchRate,
    totalAmount,
  };
}
