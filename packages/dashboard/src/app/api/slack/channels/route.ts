import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import type { SlackChannel } from '@baepdoongi/shared';

/**
 * Slack 공개 채널 목록을 조회합니다.
 *
 * GET /api/slack/channels
 */

const slackClient = new WebClient(process.env['SLACK_BOT_TOKEN']);

export async function GET() {
  try {
    // 토큰 확인
    if (!process.env['SLACK_BOT_TOKEN']) {
      console.error('[Slack Channels API] SLACK_BOT_TOKEN is not set');
      return NextResponse.json(
        { error: 'SLACK_BOT_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const result = await slackClient.conversations.list({
        ...(cursor ? { cursor } : {}),
        limit: 200,
        types: 'public_channel,private_channel',
        exclude_archived: true,
      });

      for (const channel of result.channels || []) {
        if (channel.id && channel.name) {
          channels.push({
            id: channel.id,
            name: channel.name,
          });
        }
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    // 채널 이름 기준 정렬
    channels.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(channels);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code || 'unknown';
    console.error('[Slack Channels API] Error:', errorCode, errorMessage);
    return NextResponse.json(
      { error: `Slack API error: ${errorCode} - ${errorMessage}` },
      { status: 500 }
    );
  }
}
