/**
 * 대시보드 통계 API 핸들러
 *
 * GET /api/stats - 대시보드 통계 조회
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { createResponse, createErrorResponse } from './index.js';
import { getSecrets } from '../../services/secrets.service.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DashboardStats, Event, Suggestion, Member } from '@baepdoongi/shared';
import { countTodayRagQueries } from '../../services/db.service.js';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'baepdoongi-table';

// 이름 형식 검증
const NAME_PATTERN = /^[가-힣a-zA-Z]+\s*\/\s*[가-힣a-zA-Z\s]+\s*\/\s*\d{2}$/;

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

interface SlackMember {
  slackId: string;
  displayName: string;
  joinedAt: string;
}

export async function handleStats(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    // Slack에서 회원 목록 가져오기 (총 인원, 이름 형식 준수 계산용)
    const slackMembers = await fetchSlackMembers();
    const totalMembers = slackMembers.length;
    const validNameMembers = slackMembers.filter((m) =>
      NAME_PATTERN.test(m.displayName)
    ).length;

    // 이번 달 신규 가입자 (DB의 joinedAt 기준으로 정확한 계산)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let newMembersThisMonth = 0;

    try {
      const dbMembersResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: {
            ':pk': 'MEMBER',
          },
        })
      );
      const dbMembers = (dbMembersResult.Items as Member[]) || [];
      newMembersThisMonth = dbMembers.filter((m) => {
        if (!m.joinedAt) return false;
        const joinedAt = new Date(m.joinedAt);
        return joinedAt >= startOfMonth;
      }).length;
    } catch (memberDbError) {
      console.error('[Stats API] Member DB Error:', memberDbError);
      // DB 조회 실패 시 0으로 설정
    }

    // DynamoDB에서 이벤트 조회
    let activeEvents = 0;
    let pendingSuggestions = 0;

    try {
      const eventsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: {
            ':pk': 'EVENT',
          },
        })
      );

      const events = (eventsResult.Items as Event[]) || [];
      const upcoming = events.filter((e) => {
        const eventDate = new Date(e.datetime);
        return eventDate >= now && e.status !== 'cancelled';
      });
      activeEvents = upcoming.length;

      // 건의사항 조회
      const suggestionsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: {
            ':pk': 'SUGGESTION',
          },
        })
      );

      const suggestions = (suggestionsResult.Items as Suggestion[]) || [];
      pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length;
    } catch (dbError) {
      console.error('[Stats API] DB Error:', dbError);
      // DB 연결 실패 시 0으로 설정
    }

    // RAG 쿼리 수 조회
    let ragQueriesToday = 0;
    try {
      ragQueriesToday = await countTodayRagQueries();
    } catch (ragError) {
      console.error('[Stats API] RAG count error:', ragError);
    }

    const stats: DashboardStats = {
      totalMembers,
      validNameMembers,
      newMembersThisMonth,
      activeEvents,
      pendingSuggestions,
      ragQueriesToday,
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch stats');
  }
}

async function fetchSlackMembers(): Promise<SlackMember[]> {
  const client = await getSlackClient();
  const members: SlackMember[] = [];
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

      members.push({
        slackId: user.id!,
        displayName,
        joinedAt: user.updated
          ? new Date(user.updated * 1000).toISOString()
          : new Date().toISOString(),
      });
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  return members;
}
