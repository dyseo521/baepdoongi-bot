/**
 * DynamoDB 클라이언트 및 헬퍼 함수
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Event, Member, RSVP, ActivityLog, LogType, Suggestion } from '@baepdoongi/shared';

const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'ap-northeast-2',
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env['DYNAMODB_TABLE_NAME'] || 'baepdoongi-table';

/**
 * 모든 이벤트 조회
 */
export async function getAllEvents(): Promise<Event[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'EVENT',
      },
    })
  );

  return (result.Items as Event[]) || [];
}

/**
 * 이벤트 조회
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EVENT#${eventId}`,
        SK: 'DETAIL',
      },
    })
  );

  return (result.Item as Event) || null;
}

/**
 * 이벤트 저장
 */
export async function saveEvent(event: Event): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `EVENT#${event.eventId}`,
        SK: 'DETAIL',
        GSI1PK: 'EVENT',
        GSI1SK: `EVENT#${event.datetime}`,
        ...event,
      },
    })
  );
}

/**
 * 이벤트 삭제
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EVENT#${eventId}`,
        SK: 'DETAIL',
      },
    })
  );
}

/**
 * 모든 회원 조회
 */
export async function getAllMembers(): Promise<Member[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'MEMBER',
      },
    })
  );

  return (result.Items as Member[]) || [];
}

/**
 * 회원 저장
 */
export async function saveMember(member: Member): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `MEMBER#${member.slackId}`,
        SK: 'DETAIL',
        GSI1PK: 'MEMBER',
        GSI1SK: `MEMBER#${member.joinedAt}`,
        ...member,
      },
    })
  );
}

/**
 * 이벤트 RSVP 목록 조회
 */
export async function getEventRSVPs(eventId: string): Promise<RSVP[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'RSVP#',
      },
    })
  );

  return (result.Items as RSVP[]) || [];
}

/**
 * 활동 로그 저장
 */
export async function saveActivityLog(log: Omit<ActivityLog, 'logId' | 'createdAt'>): Promise<ActivityLog> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  const fullLog: ActivityLog = {
    ...log,
    logId,
    createdAt,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: 'LOG',
        SK: `LOG#${createdAt}#${logId}`,
        GSI1PK: 'LOG',
        GSI1SK: `LOG#${createdAt}`,
        GSI2PK: `LOG#${log.type}`,
        GSI2SK: createdAt,
        ...fullLog,
      },
    })
  );

  return fullLog;
}

/**
 * 활동 로그 조회 (최신순, 페이지네이션)
 */
export async function getActivityLogs(options?: {
  limit?: number;
  type?: LogType;
  startKey?: Record<string, unknown>;
}): Promise<{ logs: ActivityLog[]; lastKey?: Record<string, unknown> }> {
  const limit = options?.limit || 50;

  let result;

  if (options?.type) {
    // 특정 타입 로그만 조회 (GSI2 사용)
    result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `LOG#${options.type}`,
        },
        ScanIndexForward: false, // 최신순
        Limit: limit,
        ExclusiveStartKey: options?.startKey,
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
        ScanIndexForward: false, // 최신순
        Limit: limit,
        ExclusiveStartKey: options?.startKey,
      })
    );
  }

  const response: { logs: ActivityLog[]; lastKey?: Record<string, unknown> } = {
    logs: (result.Items as ActivityLog[]) || [],
  };

  if (result.LastEvaluatedKey) {
    response.lastKey = result.LastEvaluatedKey as Record<string, unknown>;
  }

  return response;
}

/**
 * 오늘 로그 수 조회
 */
export async function getTodayLogCount(type?: LogType): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  let result;

  if (type) {
    result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK >= :today',
        ExpressionAttributeValues: {
          ':pk': `LOG#${type}`,
          ':today': todayStr,
        },
        Select: 'COUNT',
      })
    );
  } else {
    result = await docClient.send(
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
  }

  return result.Count || 0;
}

/**
 * 모든 건의사항 조회 (최신순)
 */
export async function getAllSuggestions(): Promise<Suggestion[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'SUGGESTION',
      },
      ScanIndexForward: false, // 최신순
    })
  );

  return (result.Items as Suggestion[]) || [];
}

/**
 * 건의사항 상태 업데이트
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: Suggestion['status']
): Promise<void> {
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
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }

  const suggestion = result.Item as Suggestion;

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
}
