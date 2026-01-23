import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { getAllMembers, saveMember, saveActivityLog } from '@/lib/db';
import type { Member } from '@baepdoongi/shared';

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

// 이름 형식 검증: 이름/학과/학번(2자리) - 슬래시 주변 공백 허용
// 예: "홍길동/컴퓨터공학과/24" 또는 "홍길동 / 컴퓨터공학과 / 24"
const NAME_PATTERN = /^[가-힣a-zA-Z]+\s*\/\s*[가-힣a-zA-Z\s]+\s*\/\s*\d{2}$/;

/**
 * 회원 목록 조회
 * GET /api/members
 *
 * ?source=slack - Slack에서 실시간으로 가져오기
 * ?source=db - DynamoDB에서 가져오기 (기본값)
 * ?sync=true - Slack에서 가져온 후 DB에 동기화
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source') || 'db';
    const sync = url.searchParams.get('sync') === 'true';

    if (source === 'slack' || sync) {
      // Slack에서 회원 목록 가져오기
      const members = await fetchSlackMembers();

      if (sync) {
        // DB에 동기화
        for (const member of members) {
          await saveMember(member);
        }
      }

      return NextResponse.json(members);
    }

    // DB에서 가져오기
    const members = await getAllMembers();

    // 이름순 정렬
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json(members);
  } catch (error) {
    console.error('[Members API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/**
 * Slack 워크스페이스에서 회원 목록 가져오기
 */
async function fetchSlackMembers(): Promise<Member[]> {
  const members: Member[] = [];
  let cursor: string | undefined;

  do {
    const result = await slackClient.users.list({
      ...(cursor ? { cursor } : {}),
      limit: 200,
    });

    for (const user of result.members || []) {
      // 봇, 삭제된 사용자, 앱 제외
      if (user.is_bot || user.deleted || user.is_app_user) continue;
      // Slackbot 제외
      if (user.id === 'USLACKBOT') continue;

      const displayName = user.profile?.display_name || user.real_name || user.name || '';
      const isNameValid = NAME_PATTERN.test(displayName);

      const member: Member = {
        slackId: user.id!,
        displayName,
        realName: user.real_name || '',
        email: user.profile?.email || '',
        isNameValid,
        warningCount: 0,
        joinedAt: user.updated ? new Date(user.updated * 1000).toISOString() : new Date().toISOString(),
      };
      if (user.profile?.image_72) {
        member.imageUrl = user.profile.image_72;
      }
      members.push(member);
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  // 이름순 정렬
  members.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return members;
}

/**
 * 회원 동기화 (Slack → DB)
 * POST /api/members/sync
 */
export async function POST() {
  try {
    const members = await fetchSlackMembers();

    for (const member of members) {
      await saveMember(member);
    }

    // 활동 로그 기록
    const validCount = members.filter(m => m.isNameValid).length;
    const invalidCount = members.length - validCount;

    await saveActivityLog({
      type: 'MEMBER_SYNC',
      userId: 'dashboard',
      details: {
        totalCount: members.length,
        validNameCount: validCount,
        invalidNameCount: invalidCount,
      },
    });

    return NextResponse.json({
      success: true,
      count: members.length,
      message: `${members.length}명의 회원을 동기화했습니다.`,
    });
  } catch (error) {
    console.error('[Members API] Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync members' },
      { status: 500 }
    );
  }
}
