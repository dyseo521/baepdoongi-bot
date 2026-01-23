import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { saveActivityLog } from '@/lib/db';

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

/**
 * 회원에게 이름 형식 경고 DM 보내기
 * POST /api/members/:memberId/warn
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { memberId } = await params;

    // DM 채널 열기
    const dmResult = await slackClient.conversations.open({
      users: memberId,
    });

    if (!dmResult.ok || !dmResult.channel?.id) {
      return NextResponse.json(
        { error: 'DM 채널을 열 수 없습니다' },
        { status: 500 }
      );
    }

    // 경고 메시지 전송
    const message = `안녕하세요! 👋

IGRUS 슬랙 워크스페이스의 *이름 형식*이 올바르지 않아 안내 드립니다.

📋 *올바른 이름 형식:* \`이름/학과/학번(2자리)\`
예시: \`홍길동/컴퓨터공학과/24\`

현재 표시 이름을 위 형식에 맞게 수정해 주세요.

*이름 변경 방법:*
1. Slack 좌측 상단 워크스페이스 이름 클릭
2. "프로필" 선택
3. "프로필 편집" 클릭
4. "표시 이름" 수정 후 저장

이름 형식을 지켜주시면 동아리 활동 관리에 큰 도움이 됩니다. 감사합니다! 🙏`;

    await slackClient.chat.postMessage({
      channel: dmResult.channel.id,
      text: message,
      mrkdwn: true,
    });

    // 활동 로그 기록
    await saveActivityLog({
      type: 'NAME_WARNING_SENT',
      userId: 'dashboard',
      targetUserId: memberId,
      details: {
        dmChannelId: dmResult.channel.id,
        reason: '이름 형식 미준수',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'DM을 전송했습니다.',
    });
  } catch (error) {
    console.error('[Members API] Warn Error:', error);
    return NextResponse.json(
      { error: 'DM 전송 실패' },
      { status: 500 }
    );
  }
}
