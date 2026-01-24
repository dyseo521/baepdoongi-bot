/**
 * 건의사항 API 핸들러
 *
 * GET /api/suggestions - 건의사항 목록 조회
 * PATCH /api/suggestions/:suggestionId - 상태 업데이트
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './index.js';
import { listSuggestions, saveSuggestion, saveLog } from '../../services/db.service.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Suggestion, SuggestionStatus } from '@baepdoongi/shared';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'baepdoongi-table';

export async function handleSuggestions(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;

  // GET /api/suggestions
  if (subPath === '' && method === 'GET') {
    return handleGetSuggestions();
  }

  // PATCH /api/suggestions/:suggestionId
  const suggestionIdMatch = subPath.match(/^\/([^/]+)$/);
  if (suggestionIdMatch?.[1] && method === 'PATCH') {
    return handleUpdateSuggestion(event, suggestionIdMatch[1]);
  }

  return createErrorResponse(404, 'Not found');
}

async function handleGetSuggestions(): Promise<APIGatewayProxyResult> {
  try {
    const suggestions = await listSuggestions();
    return createResponse(200, suggestions);
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return createErrorResponse(500, '건의사항을 불러오는데 실패했습니다');
  }
}

async function handleUpdateSuggestion(
  event: APIGatewayProxyEvent,
  suggestionId: string
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { status } = body as { status: SuggestionStatus };

    if (!status) {
      return createErrorResponse(400, '상태값이 필요합니다');
    }

    const validStatuses: SuggestionStatus[] = ['pending', 'in_review', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return createErrorResponse(400, '유효하지 않은 상태값입니다');
    }

    // 건의사항 조회
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `SUGGESTION#${suggestionId}`,
          SK: 'DETAIL',
        },
      })
    );

    if (!result.Item) {
      return createErrorResponse(404, '건의사항을 찾을 수 없습니다');
    }

    const suggestion = result.Item as Suggestion;

    // 상태 업데이트
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `SUGGESTION#${suggestionId}`,
          SK: 'DETAIL',
          GSI1PK: 'SUGGESTION',
          GSI1SK: `SUGGESTION#${suggestion.createdAt}`,
          ...suggestion,
          status,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    // 활동 로그 기록
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'SUGGESTION_READ',
      userId: 'dashboard',
      details: {
        suggestionId,
        status,
      },
    });

    return createResponse(200, { success: true, suggestionId, status });
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return createErrorResponse(500, '상태 업데이트에 실패했습니다');
  }
}
