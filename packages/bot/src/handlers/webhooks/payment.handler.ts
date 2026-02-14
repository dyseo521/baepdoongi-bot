/**
 * Tasker 입금 알림 웹훅 핸들러
 *
 * POST /api/webhooks/payments
 *
 * 토스뱅크 앱 알림을 Tasker가 감지해서 이 엔드포인트로 전송합니다.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './index.js';
import { saveDeposit, saveLog } from '../../services/db.service.js';
import { performAutoMatch } from '../../services/payment.service.js';
import { getSecrets } from '../../services/secrets.service.js';
import type { Deposit } from '@baepdoongi/shared';
import { randomUUID } from 'crypto';

/**
 * Tasker 알림에서 입금 정보를 파싱합니다.
 *
 * 실제 형식:
 * - title: "1원 입금" 또는 "30,000원 입금"
 * - text: "서동윤 →  모임통장 (2581)" 또는 "서동윤23 →  모임통장 (2581)"
 */
function parseDepositNotification(title: string, text: string): {
  depositorName: string;
  amount: number;
} | null {
  // title에서 금액 추출: "30,000원 입금" -> 30000
  const amountMatch = title.match(/([\d,]+)원/);
  if (!amountMatch || !amountMatch[1]) {
    return null;
  }
  const amountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseInt(amountStr, 10);

  if (isNaN(amount)) {
    return null;
  }

  // text에서 입금자 이름 추출: "서동윤 →  모임통장" -> "서동윤"
  // "서동윤23 →  모임통장" -> "서동윤23" (학번 포함 가능)
  const nameMatch = text.match(/^(.+?)\s*→/);
  if (!nameMatch || !nameMatch[1]) {
    return null;
  }
  const depositorName = nameMatch[1].trim();

  return { depositorName, amount };
}

/** Tasker 웹훅 요청 본문 (flat 구조) */
interface TaskerWebhookRequest {
  title: string;  // "1원 입금"
  text: string;   // "서동윤 →  모임통장 (2581)"
}

export async function handlePaymentWebhook(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body: TaskerWebhookRequest = JSON.parse(event.body || '{}');

    // 시크릿 검증 (헤더에서)
    const secrets = await getSecrets();
    const expectedSecret = secrets.PAYMENT_WEBHOOK_SECRET;
    const headerSecret = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];

    if (expectedSecret && headerSecret !== expectedSecret) {
      console.error('[Payment Webhook] Invalid secret');
      return createErrorResponse(401, 'Invalid secret');
    }

    // 알림 필드 검증
    if (!body.title || !body.text) {
      console.error('[Payment Webhook] Missing fields:', { title: body.title, text: body.text });
      return createErrorResponse(400, 'title과 text는 필수입니다');
    }

    const { title, text } = body;

    // 출금 알림 무시
    if (title.includes('출금')) {
      console.log(`[Payment Webhook] 출금 알림, 무시: ${title}`);
      return createResponse(200, {
        success: false,
        message: '출금 알림입니다. 무시됩니다.',
      });
    }

    // 모임통장 입금만 처리 (다른 계좌 알림 무시)
    if (!text.includes('모임통장')) {
      console.log(`[Payment Webhook] 모임통장 아님, 무시: ${text}`);
      return createResponse(200, {
        success: false,
        message: '모임통장 입금이 아닙니다. 무시됩니다.',
      });
    }

    // 입금 정보 파싱 (title, text 모두 전달)
    const parsed = parseDepositNotification(title, text);

    if (!parsed) {
      console.warn(`[Payment Webhook] 파싱 실패: title=${title}, text=${text}`);
      return createResponse(200, {
        success: false,
        message: '입금 알림 형식이 아닙니다. 무시됩니다.',
      });
    }

    const now = new Date().toISOString();
    const depositId = `dep_${randomUUID()}`;

    const deposit: Deposit = {
      depositId,
      depositorName: parsed.depositorName,
      amount: parsed.amount,
      timestamp: now,
      status: 'pending',
      rawNotification: `${title} | ${text}`,
      createdAt: now,
    };

    // 입금 저장
    await saveDeposit(deposit);

    // 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'DEPOSIT_RECEIVE',
      userId: 'system',
      details: {
        depositId,
        depositorName: parsed.depositorName,
        amount: parsed.amount,
        rawNotification: `${title} | ${text}`,
      },
    });

    console.log(`[Payment Webhook] 입금 수신: ${parsed.depositorName} - ${parsed.amount}원`);

    // 자동 매칭 시도
    const match = await performAutoMatch(deposit);

    if (match) {
      console.log(
        `[Payment Webhook] 자동 매칭 성공: ${depositId} → ${match.submissionId} (신뢰도: ${match.confidence}%)`
      );

      return createResponse(200, {
        success: true,
        depositId,
        matched: true,
        matchId: match.matchId,
        confidence: match.confidence,
        message: '입금이 자동 매칭되었습니다.',
      });
    }

    return createResponse(200, {
      success: true,
      depositId,
      matched: false,
      message: '입금이 접수되었습니다. 수동 매칭이 필요합니다.',
    });
  } catch (error) {
    console.error('[Payment Webhook] Error:', error);
    return createErrorResponse(500, 'Failed to process payment');
  }
}
