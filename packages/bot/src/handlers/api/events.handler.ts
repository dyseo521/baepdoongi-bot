/**
 * 이벤트 API 핸들러
 *
 * GET /api/events - 이벤트 목록 조회
 * POST /api/events - 이벤트 생성
 * GET /api/events/:eventId - 이벤트 상세 조회
 * PUT /api/events/:eventId - 이벤트 수정
 * DELETE /api/events/:eventId - 이벤트 삭제
 * POST /api/events/:eventId/announce - Slack 공지
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { createResponse, createErrorResponse } from './index.js';
import {
  getEvent,
  saveEvent,
  getUpcomingEvents,
  getEventRSVPs,
  saveLog,
  listMembers,
} from '../../services/db.service.js';
import { buildEventAnnouncementBlocks } from '../../services/slack.service.js';
import { getSecrets } from '../../services/secrets.service.js';
import type { Event, EventAnnouncement, EventResponseOption, RSVPWithMember, RSVPListResponse } from '@baepdoongi/shared';
import { randomUUID } from 'crypto';

// DynamoDB에서 삭제
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'baepdoongi-table';

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

export async function handleEvents(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;

  // GET /api/events
  if (subPath === '' && method === 'GET') {
    return handleGetEvents();
  }

  // POST /api/events
  if (subPath === '' && method === 'POST') {
    return handleCreateEvent(event);
  }

  // /api/events/:eventId/announce
  const announceMatch = subPath.match(/^\/([^/]+)\/announce$/);
  if (announceMatch?.[1] && method === 'POST') {
    return handleAnnounceEvent(event, announceMatch[1]);
  }

  // /api/events/:eventId/rsvps
  const rsvpsMatch = subPath.match(/^\/([^/]+)\/rsvps$/);
  if (rsvpsMatch?.[1] && method === 'GET') {
    return handleGetEventRSVPs(rsvpsMatch[1]);
  }

  // /api/events/:eventId
  const eventIdMatch = subPath.match(/^\/([^/]+)$/);
  if (eventIdMatch?.[1]) {
    const eventId = eventIdMatch[1];

    if (method === 'GET') {
      return handleGetEvent(eventId);
    }
    if (method === 'PUT') {
      return handleUpdateEvent(event, eventId);
    }
    if (method === 'DELETE') {
      return handleDeleteEvent(eventId);
    }
  }

  return createErrorResponse(404, 'Not found');
}

async function handleGetEvents(): Promise<APIGatewayProxyResult> {
  try {
    // GSI1에서 모든 이벤트 조회
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

    const events = (result.Items as Event[]) || [];
    events.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    return createResponse(200, events);
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch events');
  }
}

async function handleGetEvent(eventId: string): Promise<APIGatewayProxyResult> {
  try {
    const eventItem = await getEvent(eventId);

    if (!eventItem) {
      return createErrorResponse(404, 'Event not found');
    }

    return createResponse(200, eventItem);
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse(500, 'Failed to fetch event');
  }
}

async function handleCreateEvent(
  apiEvent: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(apiEvent.body || '{}');
    const eventId = `evt_${Date.now()}`;
    const now = new Date().toISOString();

    const newEvent: Event = {
      eventId,
      title: body.title,
      description: body.description || '',
      datetime: body.datetime,
      location: body.location || '',
      type: body.type || 'other',
      status: body.status || 'published',
      createdBy: body.createdBy || 'dashboard',
      createdAt: now,
    };

    await saveEvent(newEvent);

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'EVENT_CREATE',
      userId: 'dashboard',
      eventId,
      details: {
        title: newEvent.title,
        datetime: newEvent.datetime,
        location: newEvent.location,
        type: newEvent.type,
      },
    });

    return createResponse(201, newEvent);
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse(500, 'Failed to create event');
  }
}

async function handleUpdateEvent(
  apiEvent: APIGatewayProxyEvent,
  eventId: string
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(apiEvent.body || '{}');
    const existing = await getEvent(eventId);

    if (!existing) {
      return createErrorResponse(404, 'Event not found');
    }

    const updated: Event = {
      ...existing,
      ...body,
      eventId,
      announcement: existing.announcement,
    };

    let slackUpdated = false;

    // Slack 메시지 업데이트
    if (existing.announcement?.channelId && existing.announcement?.messageTs) {
      try {
        const client = await getSlackClient();
        const rsvps = await getEventRSVPs(eventId);

        const responseCounts: Record<string, number> = {};
        for (const rsvp of rsvps) {
          const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
          responseCounts[optionId] = (responseCounts[optionId] || 0) + 1;
        }

        const blocks = buildEventAnnouncementBlocks(
          updated,
          existing.announcement.responseOptions,
          responseCounts
        );

        await client.chat.update({
          channel: existing.announcement.channelId,
          ts: existing.announcement.messageTs,
          text: `📅 이벤트 공지: ${updated.title}`,
          blocks: blocks as never,
        });

        slackUpdated = true;
      } catch (slackError) {
        console.error('[Events API] Slack 메시지 업데이트 실패:', slackError);
      }
    }

    await saveEvent(updated);

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: slackUpdated ? 'EVENT_ANNOUNCE_UPDATE' : 'EVENT_UPDATE',
      userId: 'dashboard',
      eventId,
      details: {
        title: updated.title,
        datetime: updated.datetime,
        location: updated.location,
        slackUpdated,
        changes: Object.keys(body).filter((k) => k !== 'eventId'),
      },
    });

    return createResponse(200, { ...updated, slackUpdated });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse(500, 'Failed to update event');
  }
}

async function handleDeleteEvent(eventId: string): Promise<APIGatewayProxyResult> {
  try {
    const existing = await getEvent(eventId);

    if (!existing) {
      return createErrorResponse(404, 'Event not found');
    }

    // Slack 메시지 삭제
    if (existing.announcement?.channelId && existing.announcement?.messageTs) {
      try {
        const client = await getSlackClient();
        await client.chat.delete({
          channel: existing.announcement.channelId,
          ts: existing.announcement.messageTs,
        });
      } catch (slackError) {
        console.error('[Events API] Slack 메시지 삭제 실패:', slackError);
      }
    }

    // DynamoDB에서 삭제
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'DETAIL',
        },
      })
    );

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'EVENT_DELETE',
      userId: 'dashboard',
      eventId,
      details: {
        title: existing.title,
        datetime: existing.datetime,
        wasAnnounced: !!existing.announcement,
      },
    });

    return createResponse(200, { success: true, slackMessageDeleted: !!existing.announcement });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse(500, 'Failed to delete event');
  }
}

async function handleAnnounceEvent(
  apiEvent: APIGatewayProxyEvent,
  eventId: string
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(apiEvent.body || '{}');
    const { channelId, responseOptions } = body as {
      channelId: string;
      responseOptions: EventResponseOption[];
    };

    if (!channelId || !responseOptions || responseOptions.length === 0) {
      return createErrorResponse(400, 'channelId와 responseOptions가 필요합니다');
    }

    const eventItem = await getEvent(eventId);

    if (!eventItem) {
      return createErrorResponse(404, '이벤트를 찾을 수 없습니다');
    }

    if (eventItem.announcement) {
      return createErrorResponse(400, '이미 공지된 이벤트입니다');
    }

    const client = await getSlackClient();

    // 봇이 채널에 참여
    try {
      await client.conversations.join({ channel: channelId });
    } catch {
      // 이미 참여중이면 무시
    }

    // 메시지 전송
    const blocks = buildEventAnnouncementBlocks(eventItem, responseOptions);
    const result = await client.chat.postMessage({
      channel: channelId,
      text: `📅 이벤트 공지: ${eventItem.title}`,
      blocks: blocks as never,
    });

    if (!result.ok || !result.ts) {
      return createErrorResponse(500, 'Slack 메시지 전송 실패');
    }

    // 채널 정보 조회
    const channelInfo = await client.conversations.info({ channel: channelId });
    const channelName = channelInfo.channel?.name || '';

    // 이벤트에 공지 정보 저장
    const announcement: EventAnnouncement = {
      channelId,
      channelName,
      messageTs: result.ts,
      responseOptions,
      announcedAt: new Date().toISOString(),
      announcedBy: 'dashboard',
    };

    eventItem.announcement = announcement;
    await saveEvent(eventItem);

    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'EVENT_ANNOUNCE',
      userId: 'dashboard',
      eventId,
      details: {
        title: eventItem.title,
        channelId,
        channelName,
        messageTs: result.ts,
        responseOptionCount: responseOptions.length,
      },
    });

    return createResponse(200, {
      success: true,
      messageTs: result.ts,
      channelName,
    });
  } catch (error) {
    console.error('[Events API] Announce Error:', error);
    return createErrorResponse(500, 'Failed to announce event');
  }
}

async function handleGetEventRSVPs(eventId: string): Promise<APIGatewayProxyResult> {
  try {
    const eventItem = await getEvent(eventId);

    if (!eventItem) {
      return createErrorResponse(404, '이벤트를 찾을 수 없습니다');
    }

    const rsvps = await getEventRSVPs(eventId);
    const members = await listMembers();

    // 회원 정보 맵 생성
    const memberMap = new Map(
      members.map((m) => [m.slackId, { name: m.displayName || m.realName, imageUrl: m.imageUrl }])
    );

    // RSVP에 회원 정보 추가
    const rsvpsWithMember: RSVPWithMember[] = rsvps.map((rsvp) => {
      const member = memberMap.get(rsvp.memberId);
      return {
        ...rsvp,
        memberName: member?.name,
        memberImageUrl: member?.imageUrl,
      };
    });

    // 응답 시간순 정렬 (최신순)
    rsvpsWithMember.sort(
      (a, b) => new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime()
    );

    // 옵션별 응답 수 요약
    const summary: Record<string, number> = {};
    for (const rsvp of rsvps) {
      const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
      summary[optionId] = (summary[optionId] || 0) + 1;
    }

    const response: RSVPListResponse = {
      rsvps: rsvpsWithMember,
      summary,
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('[Events API] GetRSVPs Error:', error);
    return createErrorResponse(500, 'Failed to fetch RSVPs');
  }
}
