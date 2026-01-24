/**
 * 회원 API 핸들러
 *
 * GET /api/members - 회원 목록 조회
 * POST /api/members - 회원 동기화 (Slack → DB)
 * POST /api/members/:memberId/warn - 경고 DM 발송
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { createResponse, createErrorResponse } from './index.js';
import { listMembers, saveMember, saveLog } from '../../services/db.service.js';
import { sendDirectMessage } from '../../services/slack.service.js';
import { getSecrets } from '../../services/secrets.service.js';
import type { Member } from '@baepdoongi/shared';
import { randomUUID } from 'crypto';

// 이름 형식 검증: 이름/학과/학번(2자리) - 슬래시 주변 공백 허용
const NAME_PATTERN = /^[가-힣a-zA-Z]+\s*\/\s*[가-힣a-zA-Z\s]+\s*\/\s*\d{2}$/;

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

export async function handleMembers(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;

  // GET /api/members
  if (subPath === '' && method === 'GET') {
    return handleGetMembers(event);
  }

  // POST /api/members (동기화)
  if (subPath === '' && method === 'POST') {
    return handleSyncMembers();
  }

  // POST /api/members/:memberId/warn
  const warnMatch = subPath.match(/^\/([^/]+)\/warn$/);
  if (warnMatch?.[1] && method === 'POST') {
    return handleWarnMember(warnMatch[1]);
  }

  return createErrorResponse(404, 'Not found');
}

async function handleGetMembers(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const source = event.queryStringParameters?.['source'] || 'db';
    const sync = event.queryStringParameters?.['sync'] === 'true';

    if (source === 'slack' || sync) {
      const members = await fetchSlackMembers();

      if (sync) {
        for (const member of members) {
          await saveMember(member);
        }
      }

      return createResponse(200, members);
    }

    // DB에서 가져오기
    const members = await listMembers();
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return createResponse(200, members);
  } catch (error) {
    console.error('[Members API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch members');
  }
}

async function fetchSlackMembers(): Promise<Member[]> {
  const client = await getSlackClient();
  const members: Member[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.users.list({
      ...(cursor ? { cursor } : {}),
      limit: 200,
    });

    for (const user of result.members || []) {
      if (user.is_bot || user.deleted || user.is_app_user) continue;
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
        joinedAt: user.updated
          ? new Date(user.updated * 1000).toISOString()
          : new Date().toISOString(),
      };

      if (user.profile?.image_72) {
        member.imageUrl = user.profile.image_72;
      }

      members.push(member);
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return members;
}

async function handleSyncMembers(): Promise<APIGatewayProxyResult> {
  try {
    const members = await fetchSlackMembers();

    for (const member of members) {
      await saveMember(member);
    }

    const validCount = members.filter((m) => m.isNameValid).length;
    const invalidCount = members.length - validCount;

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'MEMBER_SYNC',
      userId: 'dashboard',
      details: {
        totalCount: members.length,
        validNameCount: validCount,
        invalidNameCount: invalidCount,
      },
    });

    return createResponse(200, {
      success: true,
      count: members.length,
      message: `${members.length}명의 회원을 동기화했습니다.`,
    });
  } catch (error) {
    console.error('[Members API] Sync Error:', error);
    return createErrorResponse(500, 'Failed to sync members');
  }
}

async function handleWarnMember(memberId: string): Promise<APIGatewayProxyResult> {
  try {
    const client = await getSlackClient();

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

    const success = await sendDirectMessage(client, memberId, message);

    if (!success) {
      return createErrorResponse(500, 'DM 전송 실패');
    }

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'NAME_WARNING_SENT',
      userId: 'dashboard',
      targetUserId: memberId,
      details: {
        reason: '이름 형식 미준수',
      },
    });

    return createResponse(200, {
      success: true,
      message: 'DM을 전송했습니다.',
    });
  } catch (error) {
    console.error('[Members API] Warn Error:', error);
    return createErrorResponse(500, 'DM 전송 실패');
  }
}
