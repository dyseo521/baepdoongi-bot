import { NextResponse } from 'next/server';
import { getAllEvents, saveEvent, saveActivityLog } from '@/lib/db';
import type { Event } from '@baepdoongi/shared';

/**
 * 이벤트 목록 조회
 * GET /api/events
 */
export async function GET() {
  try {
    const events = await getAllEvents();

    // 날짜순 정렬 (최신순)
    events.sort((a, b) =>
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * 이벤트 생성
 * POST /api/events
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const eventId = `evt_${Date.now()}`;
    const now = new Date().toISOString();

    const event: Event = {
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

    await saveEvent(event);

    // 활동 로그 기록
    await saveActivityLog({
      type: 'EVENT_CREATE',
      userId: 'dashboard',
      eventId,
      details: {
        title: event.title,
        datetime: event.datetime,
        location: event.location,
        type: event.type,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
