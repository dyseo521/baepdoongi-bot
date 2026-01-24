/**
 * 외부 웹훅 라우터
 *
 * API Gateway에서 /api/webhooks/* 경로로 들어온 요청을 처리합니다.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleSubmissionWebhook } from './submission.handler.js';
import { handlePaymentWebhook } from './payment.handler.js';

/** API 응답 생성 헬퍼 */
export function createResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

/** 에러 응답 생성 */
export function createErrorResponse(
  statusCode: number,
  error: string
): APIGatewayProxyResult {
  return createResponse(statusCode, { error });
}

/**
 * 웹훅 요청 라우터
 */
export async function handleWebhookRequest(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  console.log(`[Webhook] ${httpMethod} ${path}`);

  // 경로 파싱 (/api/webhooks/... 에서 /api/webhooks 제거)
  const webhookPath = path.replace(/^\/api\/webhooks/, '');

  try {
    // POST /api/webhooks/submissions - Google Form 지원서
    if (webhookPath === '/submissions' && httpMethod === 'POST') {
      return await handleSubmissionWebhook(event);
    }

    // POST /api/webhooks/payments - Tasker 입금 알림
    if (webhookPath === '/payments' && httpMethod === 'POST') {
      return await handlePaymentWebhook(event);
    }

    // 404 Not Found
    return createErrorResponse(404, `Unknown webhook path: ${webhookPath}`);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
