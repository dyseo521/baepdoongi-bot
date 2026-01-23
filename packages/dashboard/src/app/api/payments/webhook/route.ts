import { NextRequest, NextResponse } from 'next/server';
import type { TossBankWebhookRequest } from '@baepdoongi/shared';

/**
 * 토스뱅크 입금 알림 웹훅 (Tasker -> Next.js)
 *
 * Tasker의 AutoNotification 플러그인으로 토스뱅크 알림을 인터셉트하여
 * 이 엔드포인트로 HTTP POST 요청을 보냅니다.
 *
 * 요청 형식:
 * POST /api/payments/webhook
 * {
 *   "secret": "webhook-secret",
 *   "notification": {
 *     "text": "홍길동님이 30,000원을 입금했습니다",
 *     "timestamp": "2024-01-23T10:30:00+09:00"
 *   }
 * }
 */

const WEBHOOK_SECRET = process.env['PAYMENT_WEBHOOK_SECRET'] || 'dev-secret';

/**
 * 입금 알림 텍스트에서 입금자명과 금액을 파싱합니다.
 */
function parseNotification(text: string): {
  depositorName: string;
  amount: number;
} | null {
  // 토스뱅크 알림 형식: "홍길동님이 30,000원을 입금했습니다"
  // 또는: "홍길동23님이 30,000원을 입금했습니다"
  const match = text.match(/^(.+?)님이\s*([\d,]+)원을?\s*입금/);
  if (!match) {
    return null;
  }

  const depositorName = match[1]!.trim();
  const amount = parseInt(match[2]!.replace(/,/g, ''), 10);

  return { depositorName, amount };
}

/**
 * 고유 ID를 생성합니다.
 */
function generateId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: TossBankWebhookRequest = await request.json();

    // 시크릿 검증
    if (body.secret !== WEBHOOK_SECRET) {
      console.error('[Webhook] Invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notification } = body;

    // 알림 텍스트 파싱
    const parsed = parseNotification(notification.text);
    if (!parsed) {
      console.error('[Webhook] Failed to parse notification:', notification.text);
      return NextResponse.json(
        { error: 'Invalid notification format' },
        { status: 400 }
      );
    }

    const depositorName = parsed.depositorName;
    const amount = parsed.amount;
    const timestamp = notification.timestamp || new Date().toISOString();

    console.log(`[Webhook] Deposit received: ${depositorName} - ${amount}원`);

    // TODO: 실제 구현 시 다음 작업 수행:
    // 1. DynamoDB에 입금 정보 저장
    // 2. 매칭 알고리즘 실행
    // 3. 매칭 성공 시 지원서 상태 업데이트
    // 4. 매칭 성공 시 자동 초대 이메일 발송 (SES)

    const deposit = {
      depositId: generateId(),
      depositorName,
      amount,
      timestamp,
      status: 'pending',
      rawNotification: notification.text,
      createdAt: new Date().toISOString(),
    };

    // 여기서 매칭 알고리즘을 실행하고 결과에 따라 처리
    // const matchResult = await runMatchingAndProcess(deposit);

    return NextResponse.json({
      success: true,
      deposit,
      message: 'Deposit notification received',
    });
  } catch (error) {
    console.error('[Webhook] Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Toss Bank webhook endpoint',
    usage: 'POST with { secret, notification: { text, timestamp } }',
  });
}
