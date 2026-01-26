/**
 * 대시보드 통계 API 핸들러
 *
 * GET /api/stats - 대시보드 통계 조회
 * GET /api/stats/trends?days=7|14|30 - 일별 트렌드 데이터
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { createResponse, createErrorResponse } from './index.js';
import { getSecrets } from '../../services/secrets.service.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  DashboardStats,
  DashboardTrends,
  DailyDataPoint,
  Event,
  Suggestion,
  Member,
} from '@baepdoongi/shared';
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

/**
 * 일별 트렌드 데이터 조회
 * GET /api/stats/trends?days=7|14|30
 */
export async function handleStatsTrends(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const daysParam = event.queryStringParameters?.['days'];
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    // 유효한 days 값 검증 (7, 14, 30만 허용)
    if (![7, 14, 30].includes(days)) {
      return createErrorResponse(400, 'days must be 7, 14, or 30');
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 날짜별 초기화
    const dateMap: Map<string, { members: number; ragQueries: number }> = new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0] as string;
      dateMap.set(dateStr, { members: 0, ragQueries: 0 });
    }

    // 1. 회원 가입 데이터 조회 (GSI1 사용)
    const startDateStr = startDate.toISOString();
    const endDateStr = new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    try {
      const membersResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': 'MEMBER',
            ':start': `MEMBER#${startDateStr}`,
            ':end': `MEMBER#${endDateStr}`,
          },
        })
      );

      const members = (membersResult.Items as Member[]) || [];
      for (const member of members) {
        if (member.joinedAt) {
          const dateStr = member.joinedAt.split('T')[0] as string;
          const entry = dateMap.get(dateStr);
          if (entry) {
            entry.members += 1;
          }
        }
      }
    } catch (memberError) {
      console.error('[Stats Trends] Member query error:', memberError);
    }

    // 2. RAG 쿼리 데이터 조회 (GSI2 사용)
    try {
      const ragResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': 'LOG#RAG_QUERY',
            ':start': startDateStr,
            ':end': endDateStr,
          },
        })
      );

      const ragLogs = ragResult.Items || [];
      for (const log of ragLogs) {
        const createdAt = (log as { GSI2SK?: string }).GSI2SK;
        if (createdAt) {
          const dateStr = createdAt.split('T')[0] as string;
          const entry = dateMap.get(dateStr);
          if (entry) {
            entry.ragQueries += 1;
          }
        }
      }
    } catch (ragError) {
      console.error('[Stats Trends] RAG query error:', ragError);
    }

    // 결과 변환
    const dailyMembers: DailyDataPoint[] = [];
    const dailyRagQueries: DailyDataPoint[] = [];

    for (const [date, data] of dateMap) {
      dailyMembers.push({ date, count: data.members });
      dailyRagQueries.push({ date, count: data.ragQueries });
    }

    // 날짜 순 정렬
    dailyMembers.sort((a, b) => a.date.localeCompare(b.date));
    dailyRagQueries.sort((a, b) => a.date.localeCompare(b.date));

    const trends: DashboardTrends = {
      dailyMembers,
      dailyRagQueries,
    };

    return createResponse(200, trends);
  } catch (error) {
    console.error('[Stats Trends] Error:', error);
    return createErrorResponse(500, 'Failed to fetch trends');
  }
}
