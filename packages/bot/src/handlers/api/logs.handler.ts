/**
 * 활동 로그 API 핸들러
 *
 * GET /api/logs - 활동 로그 조회
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './index.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { ActivityLog, LogType } from '@baepdoongi/shared';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'baepdoongi-table';

export async function handleLogs(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const limit = parseInt(event.queryStringParameters?.['limit'] || '50', 10);
    const type = event.queryStringParameters?.['type'] as LogType | undefined;

    const { logs, hasMore } = await getActivityLogs({ limit, type });
    const todayCount = await getTodayLogCount();

    return createResponse(200, {
      logs,
      todayCount,
      hasMore,
    });
  } catch (error) {
    console.error('[Logs API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch logs');
  }
}

async function getActivityLogs(options: {
  limit: number;
  type?: LogType;
}): Promise<{ logs: ActivityLog[]; hasMore: boolean }> {
  const { limit, type } = options;

  let result;

  if (type) {
    // 특정 타입 로그만 조회 (GSI2 사용)
    result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `LOG#${type}`,
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
  } else {
    // 전체 로그 조회 (GSI1 사용)
    result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'LOG',
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
  }

  return {
    logs: (result.Items as ActivityLog[]) || [],
    hasMore: !!result.LastEvaluatedKey,
  };
}

async function getTodayLogCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :today',
      ExpressionAttributeValues: {
        ':pk': 'LOG',
        ':today': `LOG#${todayStr}`,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}
