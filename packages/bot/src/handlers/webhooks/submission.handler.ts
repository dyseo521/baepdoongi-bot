/**
 * Google Form 지원서 웹훅 핸들러
 *
 * POST /api/webhooks/submissions
 *
 * Google Form에서 지원서 제출 시 Apps Script로 이 엔드포인트에 POST 요청을 보냅니다.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './index.js';
import { saveSubmission, saveLog } from '../../services/db.service.js';
import { performAutoMatchForSubmission } from '../../services/payment.service.js';
import { getSecrets } from '../../services/secrets.service.js';
import type { Submission } from '@baepdoongi/shared';
import { randomUUID } from 'crypto';

/** Google Form 웹훅 요청 본문 (flat 구조) */
interface SubmissionWebhookRequest {
  /** 이름 */
  name: string;
  /** 학번 (8자리) */
  studentId: string;
  /** 이메일 */
  email?: string;
  /** 학과 */
  department?: string;
  /** 전화번호 */
  phone?: string;
  /** 성별 */
  gender?: string;
  /** 학년 */
  grade?: string;
  /** 재학/휴학 여부 */
  enrollmentStatus?: string;
  /** 회비 납부 완료 여부 (자가 체크) */
  hasPaid?: string;
  /** 제출 시각 (ISO 8601) */
  submittedAt?: string;
  /** 기타 필드 */
  [key: string]: unknown;
}

export async function handleSubmissionWebhook(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body: SubmissionWebhookRequest = JSON.parse(event.body || '{}');

    // 시크릿 검증 (헤더 또는 바디에서)
    const secrets = await getSecrets();
    const expectedSecret = secrets.FORM_WEBHOOK_SECRET;
    const headerSecret = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];

    if (expectedSecret && headerSecret !== expectedSecret) {
      console.error('[Submission Webhook] Invalid secret');
      return createErrorResponse(401, 'Invalid secret');
    }

    // 필수 필드 검증 (flat 구조)
    if (!body.name || !body.studentId) {
      console.error('[Submission Webhook] Missing required fields:', { name: body.name, studentId: body.studentId });
      return createErrorResponse(400, 'name과 studentId는 필수입니다');
    }

    const now = new Date().toISOString();
    const submissionId = `sub_${randomUUID()}`;

    // 기타 필드를 metadata로 분리 (flat 구조)
    const {
      name,
      studentId,
      email,
      department,
      phone,
      gender,
      grade,
      enrollmentStatus,
      hasPaid,
      submittedAt,
      ...otherFields
    } = body;

    const submission: Submission = {
      submissionId,
      name,
      studentId,
      status: 'pending',
      submittedAt: submittedAt || now,
      createdAt: now,
    };

    // Optional 필드 추가
    if (email) submission.email = email;
    if (department) submission.department = department;
    if (phone) submission.phone = phone;
    if (gender) submission.gender = gender;
    if (grade) submission.grade = grade;
    if (enrollmentStatus) submission.enrollmentStatus = enrollmentStatus;
    if (hasPaid) submission.hasPaid = hasPaid;

    // 기타 필드가 있으면 metadata에 저장
    if (Object.keys(otherFields).length > 0) {
      submission.metadata = otherFields;
    }

    // 지원서 저장
    await saveSubmission(submission);

    // 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'SUBMISSION_RECEIVE',
      userId: 'system',
      details: {
        submissionId,
        name,
        studentId,
        email,
        department,
      },
    });

    console.log(`[Submission Webhook] 지원서 수신: ${name} (${studentId})`);

    // 역방향 자동 매칭 시도 (입금이 먼저 들어온 경우)
    const match = await performAutoMatchForSubmission(submission);

    if (match) {
      console.log(
        `[Submission Webhook] 역방향 자동 매칭 성공: ${submissionId} → ${match.depositId} (신뢰도: ${match.confidence}%)`
      );

      return createResponse(200, {
        success: true,
        submissionId,
        matched: true,
        matchId: match.matchId,
        confidence: match.confidence,
        message: '지원서가 접수되고 자동 매칭되었습니다.',
      });
    }

    return createResponse(200, {
      success: true,
      submissionId,
      message: '지원서가 정상적으로 접수되었습니다.',
    });
  } catch (error) {
    console.error('[Submission Webhook] Error:', error);
    return createErrorResponse(500, 'Failed to process submission');
  }
}
