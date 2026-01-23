import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { getEvent, deleteEvent, saveEvent, getEventRSVPs, saveActivityLog } from '@/lib/db';
import type { Event, EventResponseOption } from '@baepdoongi/shared';

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

/**
 * 이벤트 공지 메시지 블록 생성
 */
function buildEventAnnouncementBlocks(
  event: Event,
  responseOptions: EventResponseOption[],
  responseCounts: Record<string, number> = {}
): unknown[] {
  const datetime = new Date(event.datetime);
  const formattedDate = datetime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sortedOptions = [...responseOptions].sort((a, b) => a.order - b.order);
  const statusParts = sortedOptions.map((opt) => {
    const count = responseCounts[opt.optionId] || 0;
    const emoji = opt.emoji || '';
    return `${emoji} ${opt.label}: ${count}명`;
  });
  const statusText = statusParts.join(' | ');

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📅 ${event.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*📍 장소*\n${event.location || '미정'}`,
        },
        {
          type: 'mrkdwn',
          text: `*🕐 일시*\n${formattedDate}`,
        },
      ],
    },
  ];

  if (event.description) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: event.description,
      },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: statusText,
        },
      ],
    },
    {
      type: 'actions',
      elements: sortedOptions.map((opt) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: `${opt.emoji || ''} ${opt.label}`.trim(),
          emoji: true,
        },
        value: `${event.eventId}:${opt.optionId}`,
        action_id: `event_response_${opt.optionId}`,
      })),
    }
  );

  return blocks;
}

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * 이벤트 조회
 * GET /api/events/:eventId
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const event = await getEvent(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('[Event API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/**
 * 이벤트 수정
 * PUT /api/events/:eventId
 *
 * Slack에 공지된 이벤트인 경우 메시지도 함께 업데이트합니다.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    const existing = await getEvent(eventId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const updated: Event = {
      ...existing,
      ...body,
      eventId, // ID는 변경 불가
      announcement: existing.announcement, // announcement는 유지
    };

    // Slack에 공지된 이벤트인 경우 메시지 업데이트
    let slackUpdated = false;
    if (existing.announcement?.channelId && existing.announcement?.messageTs) {
      try {
        // 현재 응답 현황 조회
        const rsvps = await getEventRSVPs(eventId);
        const responseCounts: Record<string, number> = {};
        for (const rsvp of rsvps) {
          const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
          responseCounts[optionId] = (responseCounts[optionId] || 0) + 1;
        }

        // 메시지 블록 생성 및 업데이트
        const blocks = buildEventAnnouncementBlocks(
          updated,
          existing.announcement.responseOptions,
          responseCounts
        );

        await slackClient.chat.update({
          channel: existing.announcement.channelId,
          ts: existing.announcement.messageTs,
          text: `📅 이벤트 공지: ${updated.title}`,
          blocks: blocks as never,
        });

        slackUpdated = true;
        console.log(`[Event API] Slack 메시지 업데이트: ${existing.announcement.messageTs}`);
      } catch (slackError) {
        console.error('[Event API] Slack 메시지 업데이트 실패:', slackError);
      }
    }

    await saveEvent(updated);

    // 활동 로그 기록
    await saveActivityLog({
      type: slackUpdated ? 'EVENT_ANNOUNCE_UPDATE' : 'EVENT_UPDATE',
      userId: 'dashboard',
      eventId,
      details: {
        title: updated.title,
        datetime: updated.datetime,
        location: updated.location,
        slackUpdated,
        changes: Object.keys(body).filter(k => k !== 'eventId'),
      },
    });

    return NextResponse.json({ ...updated, slackUpdated });
  } catch (error) {
    console.error('[Event API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * 이벤트 삭제
 * DELETE /api/events/:eventId
 *
 * Slack에 공지된 메시지도 함께 삭제합니다.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;

    const existing = await getEvent(eventId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Slack에 공지된 메시지가 있으면 삭제
    if (existing.announcement?.channelId && existing.announcement?.messageTs) {
      try {
        await slackClient.chat.delete({
          channel: existing.announcement.channelId,
          ts: existing.announcement.messageTs,
        });
        console.log(`[Event API] Slack 메시지 삭제: ${existing.announcement.messageTs}`);
      } catch (slackError) {
        // Slack 메시지 삭제 실패해도 이벤트는 삭제 진행
        console.error('[Event API] Slack 메시지 삭제 실패:', slackError);
      }
    }

    // DynamoDB에서 이벤트 삭제
    await deleteEvent(eventId);

    // 활동 로그 기록
    await saveActivityLog({
      type: 'EVENT_DELETE',
      userId: 'dashboard',
      eventId,
      details: {
        title: existing.title,
        datetime: existing.datetime,
        wasAnnounced: !!existing.announcement,
      },
    });

    return NextResponse.json({ success: true, slackMessageDeleted: !!existing.announcement });
  } catch (error) {
    console.error('[Event API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
