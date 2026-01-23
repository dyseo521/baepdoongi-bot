import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { getAllEvents, getAllSuggestions } from '@/lib/db';
import type { DashboardStats } from '@baepdoongi/shared';

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

// 이름 형식 검증: 이름/학과/학번(2자리) - 슬래시 주변 공백 허용
// 예: "홍길동/컴퓨터공학과/24" 또는 "홍길동 / 컴퓨터공학과 / 24"
const NAME_PATTERN = /^[가-힣a-zA-Z]+\s*\/\s*[가-힣a-zA-Z\s]+\s*\/\s*\d{2}$/;

/**
 * 대시보드 통계 조회
 * GET /api/stats
 */
export async function GET() {
  try {
    // Slack에서 회원 목록 가져오기
    const slackMembers = await fetchSlackMembers();
    const totalMembers = slackMembers.length;
    const validNameMembers = slackMembers.filter((m) => NAME_PATTERN.test(m.displayName)).length;

    // 이번 달 신규 가입자 (Slack updated 기준)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newMembersThisMonth = slackMembers.filter((m) => {
      const joinedAt = new Date(m.joinedAt);
      return joinedAt >= startOfMonth;
    }).length;

    // DynamoDB에서 이벤트 조회
    let activeEvents = 0;
    let pendingSuggestions = 0;
    try {
      const events = await getAllEvents();
      const upcoming = events.filter((e) => {
        const eventDate = new Date(e.datetime);
        return eventDate >= now && e.status !== 'cancelled';
      });
      activeEvents = upcoming.length;

      // 건의사항 조회
      const suggestions = await getAllSuggestions();
      pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length;
    } catch {
      // DB 연결 실패 시 0으로 설정
    }

    const stats: DashboardStats = {
      totalMembers,
      validNameMembers,
      newMembersThisMonth,
      activeEvents,
      pendingSuggestions,
      ragQueriesToday: 0, // TODO: RAG 쿼리 수 추가
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

interface SlackMember {
  slackId: string;
  displayName: string;
  joinedAt: string;
}

async function fetchSlackMembers(): Promise<SlackMember[]> {
  const members: SlackMember[] = [];
  let cursor: string | undefined;

  do {
    const result = await slackClient.users.list({
      ...(cursor ? { cursor } : {}),
      limit: 200,
    });

    for (const user of result.members || []) {
      if (user.is_bot || user.deleted || user.is_app_user) continue;
      if (user.id === 'USLACKBOT') continue;

      const displayName = user.profile?.display_name || user.real_name || user.name || '';

      members.push({
        slackId: user.id!,
        displayName,
        joinedAt: user.updated ? new Date(user.updated * 1000).toISOString() : new Date().toISOString(),
      });
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  return members;
}
