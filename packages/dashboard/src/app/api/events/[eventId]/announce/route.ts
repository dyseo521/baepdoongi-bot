import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { getEvent, saveEvent, saveActivityLog } from '@/lib/db';
import type { AnnounceEventRequest, AnnounceEventResponse, EventAnnouncement, Event } from '@baepdoongi/shared';

/**
 * 이벤트를 Slack 채널에 공지합니다.
 *
 * POST /api/events/[eventId]/announce
 * Body: { channelId: string, responseOptions: EventResponseOption[] }
 */

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

function buildEventAnnouncementBlocks(
  event: Event,
  responseOptions: AnnounceEventRequest['responseOptions']
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

  // 응답 현황 텍스트 생성
  const sortedOptions = [...responseOptions].sort((a, b) => a.order - b.order);
  const statusParts = sortedOptions.map((opt) => {
    const emoji = opt.emoji || '';
    return `${emoji} ${opt.label}: 0명`;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body: AnnounceEventRequest = await request.json();
    const { channelId, responseOptions } = body;

    if (!channelId || !responseOptions || responseOptions.length === 0) {
      return NextResponse.json(
        { error: 'channelId와 responseOptions가 필요합니다' },
        { status: 400 }
      );
    }

    // 이벤트 조회
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 공지된 이벤트인지 확인
    if (event.announcement) {
      return NextResponse.json(
        { error: '이미 공지된 이벤트입니다' },
        { status: 400 }
      );
    }

    // 봇이 채널에 참여
    try {
      await slackClient.conversations.join({ channel: channelId });
    } catch (joinError) {
      // 이미 참여중이면 무시
      console.log('[Slack] 채널 참여 시도:', joinError);
    }

    // 메시지 전송
    const blocks = buildEventAnnouncementBlocks(event, responseOptions);
    const result = await slackClient.chat.postMessage({
      channel: channelId,
      text: `📅 이벤트 공지: ${event.title}`,
      blocks: blocks as never,
    });

    if (!result.ok || !result.ts) {
      return NextResponse.json(
        { error: 'Slack 메시지 전송 실패' },
        { status: 500 }
      );
    }

    // 채널 정보 조회
    const channelInfo = await slackClient.conversations.info({ channel: channelId });
    const channelName = channelInfo.channel?.name || '';

    // 이벤트에 공지 정보 저장
    const announcement: EventAnnouncement = {
      channelId,
      channelName,
      messageTs: result.ts,
      responseOptions,
      announcedAt: new Date().toISOString(),
      announcedBy: 'dashboard', // TODO: 실제 사용자 정보
    };

    event.announcement = announcement;
    await saveEvent(event);

    // 활동 로그 기록
    await saveActivityLog({
      type: 'EVENT_ANNOUNCE',
      userId: 'dashboard',
      eventId,
      details: {
        title: event.title,
        channelId,
        channelName,
        messageTs: result.ts,
        responseOptionCount: responseOptions.length,
      },
    });

    const response: AnnounceEventResponse = {
      success: true,
      messageTs: result.ts,
      channelName,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Event Announce API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to announce event' },
      { status: 500 }
    );
  }
}
