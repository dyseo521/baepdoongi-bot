/**
 * DynamoDB 서비스
 *
 * Single Table Design을 사용하여 모든 엔티티를 단일 테이블에 저장합니다.
 * 주요 엔티티: Member, Event, RSVP, Log, Session, Suggestion
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  Member,
  Event,
  RSVP,
  ActivityLog,
  RagSession,
  Suggestion,
  Submission,
  Deposit,
  Match,
  SubmissionStatus,
  DepositStatus,
} from '@baepdoongi/shared';

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'baepdoongi-table';
const GSI1_NAME = 'GSI1';
const GSI2_NAME = 'GSI2';

// ============================================
// Member 관련 함수
// ============================================

/**
 * 회원 정보를 저장하거나 업데이트합니다.
 */
export async function saveMember(member: Member): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `MEMBER#${member.slackId}`,
    SK: 'PROFILE',
    GSI1PK: 'MEMBER',
    GSI1SK: `MEMBER#${member.joinedAt || now}`,
    ...member,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * Slack ID로 회원 정보를 조회합니다.
 */
export async function getMember(slackId: string): Promise<Member | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `MEMBER#${slackId}`,
        SK: 'PROFILE',
      },
    })
  );

  return (result.Item as Member) || null;
}

/**
 * 모든 회원 목록을 조회합니다.
 */
export async function listMembers(): Promise<Member[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'MEMBER',
      },
    })
  );

  return (result.Items as Member[]) || [];
}

/**
 * 이름 형식 미준수 회원 목록을 조회합니다.
 */
export async function getMembersWithInvalidName(): Promise<Member[]> {
  const members = await listMembers();
  return members.filter((m) => !m.isNameValid);
}

// ============================================
// Event 관련 함수
// ============================================

/**
 * 이벤트를 저장합니다.
 */
export async function saveEvent(event: Event): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `EVENT#${event.eventId}`,
    SK: 'DETAIL',
    GSI1PK: 'EVENT',
    GSI1SK: `EVENT#${event.datetime}`,
    ...event,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 이벤트를 조회합니다.
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
 * 다가오는 이벤트 목록을 조회합니다.
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date().toISOString();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :sk',
      ExpressionAttributeValues: {
        ':pk': 'EVENT',
        ':sk': `EVENT#${now}`,
      },
    })
  );

  return (result.Items as Event[]) || [];
}

// ============================================
// RSVP 관련 함수
// ============================================

/**
 * RSVP(참석 응답)를 저장합니다.
 */
export async function saveRSVP(rsvp: RSVP): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `EVENT#${rsvp.eventId}`,
    SK: `RSVP#${rsvp.memberId}`,
    GSI1PK: `MEMBER#${rsvp.memberId}`,
    GSI1SK: `RSVP#${rsvp.eventId}`,
    ...rsvp,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 이벤트의 모든 RSVP를 조회합니다.
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

// ============================================
// Log 관련 함수
// ============================================

/**
 * 활동 로그를 저장합니다 (30일 TTL 적용).
 * Dashboard와 동일한 스키마를 사용하여 통합 조회 가능
 */
export async function saveLog(
  log: Omit<ActivityLog, 'createdAt'> & { createdAt?: string }
): Promise<void> {
  const now = new Date();
  const createdAt = log.createdAt || now.toISOString();
  const ttl = Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60; // 30일 후

  const item = {
    // Dashboard와 동일한 스키마
    PK: 'LOG',
    SK: `LOG#${createdAt}#${log.logId}`,
    GSI1PK: 'LOG',
    GSI1SK: `LOG#${createdAt}`,
    GSI2PK: `LOG#${log.type}`,
    GSI2SK: createdAt,
    ...log,
    createdAt,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 오늘의 RAG 쿼리 수를 반환합니다.
 */
export async function countTodayRagQueries(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2_NAME,
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': 'LOG#RAG_QUERY',
        ':start': startOfDay,
        ':end': endOfDay,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}

/**
 * 특정 날짜의 로그를 조회합니다.
 */
export async function getLogsByDate(date: string): Promise<ActivityLog[]> {
  const startOfDay = `LOG#${date}T00:00:00`;
  const endOfDay = `LOG#${date}T23:59:59`;

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': 'LOG',
        ':start': startOfDay,
        ':end': endOfDay,
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as ActivityLog[]) || [];
}

// ============================================
// RAG Session 관련 함수
// ============================================

/**
 * RAG 세션을 저장합니다 (1일 TTL 적용).
 */
export async function saveRagSession(session: RagSession): Promise<void> {
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + 24 * 60 * 60; // 1일 후

  const item = {
    PK: `SESSION#${session.sessionId}`,
    SK: 'RAG',
    ...session,
    createdAt: now.toISOString(),
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * RAG 세션을 조회합니다.
 */
export async function getRagSession(sessionId: string): Promise<RagSession | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `SESSION#${sessionId}`,
        SK: 'RAG',
      },
    })
  );

  return (result.Item as RagSession) || null;
}

// ============================================
// Suggestion (익명 건의) 관련 함수
// ============================================

/**
 * 익명 건의를 저장합니다.
 */
export async function saveSuggestion(suggestion: Suggestion): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `SUGGESTION#${suggestion.suggestionId}`,
    SK: 'DETAIL',
    GSI1PK: 'SUGGESTION',
    GSI1SK: `SUGGESTION#${suggestion.createdAt || now}`,
    ...suggestion,
    createdAt: suggestion.createdAt || now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 모든 익명 건의를 조회합니다.
 */
export async function listSuggestions(): Promise<Suggestion[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'SUGGESTION',
      },
      ScanIndexForward: false, // 최신순 정렬
    })
  );

  return (result.Items as Suggestion[]) || [];
}

// ============================================
// Submission (지원서) 관련 함수
// ============================================

/**
 * 지원서를 저장합니다.
 */
export async function saveSubmission(submission: Submission): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `SUB#${submission.submissionId}`,
    SK: 'DETAIL',
    GSI1PK: 'SUBMISSION',
    GSI1SK: `SUBMISSION#${submission.submittedAt}`,
    GSI2PK: `SUB_STATUS#${submission.status}`,
    GSI2SK: submission.submittedAt,
    ...submission,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 지원서를 조회합니다.
 */
export async function getSubmission(submissionId: string): Promise<Submission | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `SUB#${submissionId}`,
        SK: 'DETAIL',
      },
    })
  );

  return (result.Item as Submission) || null;
}

/**
 * 상태별 지원서 목록을 조회합니다.
 */
export async function listSubmissionsByStatus(status: SubmissionStatus): Promise<Submission[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2_NAME,
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SUB_STATUS#${status}`,
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as Submission[]) || [];
}

/**
 * 모든 지원서 목록을 조회합니다.
 */
export async function listSubmissions(): Promise<Submission[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'SUBMISSION',
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as Submission[]) || [];
}

/**
 * 이름으로 pending 상태의 지원서를 검색합니다.
 */
export async function findPendingSubmissionsByName(name: string): Promise<Submission[]> {
  const pendingSubmissions = await listSubmissionsByStatus('pending');
  return pendingSubmissions.filter((sub) => sub.name === name);
}

/**
 * 지원서 상태를 업데이트합니다.
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  additionalFields?: Partial<Submission>
): Promise<void> {
  const now = new Date().toISOString();
  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  const updatedSubmission: Submission = {
    ...submission,
    ...additionalFields,
    status,
    updatedAt: now,
  };

  await saveSubmission(updatedSubmission);
}

// ============================================
// Deposit (입금) 관련 함수
// ============================================

/**
 * 입금 정보를 저장합니다.
 */
export async function saveDeposit(deposit: Deposit): Promise<void> {
  const now = new Date().toISOString();
  const item = {
    PK: `DEP#${deposit.depositId}`,
    SK: 'DETAIL',
    GSI1PK: 'DEPOSIT',
    GSI1SK: `DEPOSIT#${deposit.timestamp}`,
    GSI2PK: `DEP_STATUS#${deposit.status}`,
    GSI2SK: deposit.timestamp,
    ...deposit,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 입금 정보를 조회합니다.
 */
export async function getDeposit(depositId: string): Promise<Deposit | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DEP#${depositId}`,
        SK: 'DETAIL',
      },
    })
  );

  return (result.Item as Deposit) || null;
}

/**
 * 상태별 입금 목록을 조회합니다.
 */
export async function listDepositsByStatus(status: DepositStatus): Promise<Deposit[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2_NAME,
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `DEP_STATUS#${status}`,
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as Deposit[]) || [];
}

/**
 * 모든 입금 목록을 조회합니다.
 */
export async function listDeposits(): Promise<Deposit[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'DEPOSIT',
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as Deposit[]) || [];
}

/**
 * 입금 상태를 업데이트합니다.
 */
export async function updateDepositStatus(
  depositId: string,
  status: DepositStatus,
  additionalFields?: Partial<Deposit>
): Promise<void> {
  const deposit = await getDeposit(depositId);
  if (!deposit) {
    throw new Error(`Deposit not found: ${depositId}`);
  }

  const now = new Date().toISOString();
  const updatedDeposit: Deposit = {
    ...deposit,
    ...additionalFields,
    status,
    updatedAt: now,
  };

  await saveDeposit(updatedDeposit);
}

// ============================================
// Match (매칭 이력) 관련 함수
// ============================================

/**
 * 매칭 이력을 저장합니다.
 */
export async function saveMatch(match: Match): Promise<void> {
  const item = {
    PK: `MATCH#${match.matchId}`,
    SK: 'DETAIL',
    GSI1PK: 'MATCH',
    GSI1SK: `MATCH#${match.createdAt}`,
    ...match,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * 매칭 이력을 조회합니다.
 */
export async function getMatch(matchId: string): Promise<Match | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `MATCH#${matchId}`,
        SK: 'DETAIL',
      },
    })
  );

  return (result.Item as Match) || null;
}

/**
 * 모든 매칭 이력을 조회합니다.
 */
export async function listMatches(): Promise<Match[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'MATCH',
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items as Match[]) || [];
}

export { docClient, TABLE_NAME };
