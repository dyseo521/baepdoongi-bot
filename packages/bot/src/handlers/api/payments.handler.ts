/**
 * 결제 API 핸들러
 *
 * GET /api/payments/submissions - 지원서 목록
 * GET /api/payments/deposits - 입금 목록
 * GET /api/payments/matches - 매칭 이력
 * GET /api/payments/stats - 결제 통계
 * POST /api/payments/match - 수동 매칭
 * POST /api/payments/invite - 초대 이메일 발송
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { createResponse, createErrorResponse } from './index.js';
import {
  listSubmissions,
  listDeposits,
  listMatches,
  deleteSubmission as deleteSubmissionFromDb,
  deleteDeposit as deleteDepositFromDb,
  getSubmission,
  getDeposit,
  saveLog,
} from '../../services/db.service.js';
import {
  manualMatch,
  sendSubmissionInvite,
  getPaymentStats,
} from '../../services/payment.service.js';

// Slack 워크스페이스 초대 링크 (환경 변수에서 가져오거나 설정)
const SLACK_INVITE_LINK = process.env.SLACK_INVITE_LINK || 'https://join.slack.com/t/igrus/shared_invite/xxx';

export async function handlePayments(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;

  // GET /api/payments/submissions
  if (subPath === '/submissions' && method === 'GET') {
    return handleGetSubmissions();
  }

  // GET /api/payments/deposits
  if (subPath === '/deposits' && method === 'GET') {
    return handleGetDeposits();
  }

  // GET /api/payments/matches
  if (subPath === '/matches' && method === 'GET') {
    return handleGetMatches();
  }

  // GET /api/payments/stats
  if (subPath === '/stats' && method === 'GET') {
    return handleGetPaymentStats();
  }

  // POST /api/payments/match
  if (subPath === '/match' && method === 'POST') {
    return handleManualMatch(event);
  }

  // POST /api/payments/invite
  if (subPath === '/invite' && method === 'POST') {
    return handleSendInvite(event);
  }

  // DELETE /api/payments/submissions/:submissionId
  const submissionDeleteMatch = subPath.match(/^\/submissions\/([^/]+)$/);
  if (submissionDeleteMatch && method === 'DELETE') {
    return handleDeleteSubmission(submissionDeleteMatch[1] ?? '');
  }

  // DELETE /api/payments/deposits/:depositId
  const depositDeleteMatch = subPath.match(/^\/deposits\/([^/]+)$/);
  if (depositDeleteMatch && method === 'DELETE') {
    return handleDeleteDeposit(depositDeleteMatch[1] ?? '');
  }

  return createErrorResponse(404, 'Not found');
}

async function handleGetSubmissions(): Promise<APIGatewayProxyResult> {
  try {
    const submissions = await listSubmissions();
    return createResponse(200, submissions);
  } catch (error) {
    console.error('[Payments API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch submissions');
  }
}

async function handleGetDeposits(): Promise<APIGatewayProxyResult> {
  try {
    const deposits = await listDeposits();
    return createResponse(200, deposits);
  } catch (error) {
    console.error('[Payments API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch deposits');
  }
}

async function handleGetMatches(): Promise<APIGatewayProxyResult> {
  try {
    const matches = await listMatches();
    return createResponse(200, matches);
  } catch (error) {
    console.error('[Payments API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch matches');
  }
}

async function handleGetPaymentStats(): Promise<APIGatewayProxyResult> {
  try {
    const stats = await getPaymentStats();
    return createResponse(200, stats);
  } catch (error) {
    console.error('[Payments API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch payment stats');
  }
}

async function handleManualMatch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { submissionId, depositId } = body;

    if (!submissionId || !depositId) {
      return createErrorResponse(400, 'submissionId와 depositId가 필요합니다');
    }

    const match = await manualMatch(submissionId, depositId, 'dashboard');

    if (!match) {
      return createErrorResponse(400, '매칭에 실패했습니다. 이미 처리된 항목일 수 있습니다.');
    }

    return createResponse(200, match);
  } catch (error) {
    console.error('[Payments API] Match Error:', error);
    return createErrorResponse(500, 'Failed to create match');
  }
}

async function handleSendInvite(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { submissionId } = body;

    if (!submissionId) {
      return createErrorResponse(400, 'submissionId가 필요합니다');
    }

    const success = await sendSubmissionInvite(submissionId, SLACK_INVITE_LINK);

    if (!success) {
      return createErrorResponse(500, '초대 이메일 발송에 실패했습니다');
    }

    return createResponse(200, { success: true });
  } catch (error) {
    console.error('[Payments API] Invite Error:', error);
    return createErrorResponse(500, 'Failed to send invite');
  }
}

async function handleDeleteSubmission(
  submissionId: string
): Promise<APIGatewayProxyResult> {
  try {
    // 지원서 조회 (존재 및 상태 확인)
    const submission = await getSubmission(submissionId);
    if (!submission) {
      return createErrorResponse(404, '지원서를 찾을 수 없습니다');
    }
    if (submission.status !== 'pending') {
      return createErrorResponse(400, 'pending 상태의 지원서만 삭제할 수 있습니다');
    }

    // 삭제 실행
    await deleteSubmissionFromDb(submissionId);

    // 활동 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'SUBMISSION_DELETE',
      userId: 'dashboard',
      details: {
        submissionId,
        name: submission.name,
        studentId: submission.studentId,
      },
    });

    console.log(`[Payments API] Submission deleted: ${submissionId}`);
    return createResponse(200, { success: true });
  } catch (error) {
    console.error('[Payments API] Delete Submission Error:', error);
    return createErrorResponse(500, '지원서 삭제에 실패했습니다');
  }
}

async function handleDeleteDeposit(
  depositId: string
): Promise<APIGatewayProxyResult> {
  try {
    // 입금 조회 (존재 및 상태 확인)
    const deposit = await getDeposit(depositId);
    if (!deposit) {
      return createErrorResponse(404, '입금 정보를 찾을 수 없습니다');
    }
    if (deposit.status !== 'pending') {
      return createErrorResponse(400, 'pending 상태의 입금만 삭제할 수 있습니다');
    }

    // 삭제 실행
    await deleteDepositFromDb(depositId);

    // 활동 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'DEPOSIT_DELETE',
      userId: 'dashboard',
      details: {
        depositId,
        depositorName: deposit.depositorName,
        amount: deposit.amount,
      },
    });

    console.log(`[Payments API] Deposit deleted: ${depositId}`);
    return createResponse(200, { success: true });
  } catch (error) {
    console.error('[Payments API] Delete Deposit Error:', error);
    return createErrorResponse(500, '입금 삭제에 실패했습니다');
  }
}
