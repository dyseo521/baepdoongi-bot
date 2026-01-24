/**
 * Slack 채널 API 핸들러
 *
 * GET /api/slack/channels - Slack 채널 목록 조회
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebClient } from '@slack/web-api';
import { createResponse, createErrorResponse } from './index.js';
import { getSecrets } from '../../services/secrets.service.js';
import type { SlackChannel } from '@baepdoongi/shared';

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

export async function handleSlackChannels(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const client = await getSlackClient();
    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const result = await client.conversations.list({
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

    return createResponse(200, channels);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code || 'unknown';
    console.error('[Slack Channels API] Error:', errorCode, errorMessage);
    return createErrorResponse(500, `Slack API error: ${errorCode} - ${errorMessage}`);
  }
}
