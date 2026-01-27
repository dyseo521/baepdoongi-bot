/**
 * Slack API 유틸리티 서비스
 *
 * 자주 사용되는 Slack API 호출을 래핑하여 재사용성을 높입니다.
 */

import type { WebClient, View } from '@slack/web-api';
import type { Event, EventResponseOption, SlackChannel, RSVP } from '@baepdoongi/shared';
import { formatEventDateTimeForDisplay } from '../utils/date-formatter.js';

/** 사용자 프로필 정보 */
export interface SlackUserProfile {
  userId: string;
  displayName: string;
  realName: string;
  email?: string;
  imageUrl?: string;
}

/**
 * Slack 사용자 프로필을 조회합니다.
 */
export async function getUserProfile(
  client: WebClient,
  userId: string
): Promise<SlackUserProfile | null> {
  try {
    const result = await client.users.info({ user: userId });

    if (!result.user) {
      return null;
    }

    const profile = result.user.profile;
    return {
      userId,
      displayName: profile?.display_name || '',
      realName: profile?.real_name || '',
      email: profile?.email,
      imageUrl: profile?.image_192,
    };
  } catch (error) {
    console.error('사용자 프로필 조회 실패:', error);
    return null;
  }
}

/**
 * 사용자에게 DM을 보냅니다.
 */
export async function sendDirectMessage(
  client: WebClient,
  userId: string,
  text: string,
  blocks?: unknown[]
): Promise<boolean> {
  try {
    // DM 채널 열기
    const conversation = await client.conversations.open({ users: userId });
    const channelId = conversation.channel?.id;

    if (!channelId) {
      console.error('DM 채널을 열 수 없습니다.');
      return false;
    }

    // 메시지 전송
    await client.chat.postMessage({
      channel: channelId,
      text,
      blocks: blocks as never,
    });

    return true;
  } catch (error) {
    console.error('DM 전송 실패:', error);
    return false;
  }
}

/**
 * 채널에 메시지를 보냅니다.
 */
export async function sendChannelMessage(
  client: WebClient,
  channelId: string,
  text: string,
  blocks?: unknown[],
  threadTs?: string
): Promise<string | null> {
  try {
    const result = await client.chat.postMessage({
      channel: channelId,
      text,
      blocks: blocks as never,
      thread_ts: threadTs,
    });

    return result.ts || null;
  } catch (error) {
    console.error('채널 메시지 전송 실패:', error);
    return null;
  }
}

/**
 * 메시지를 업데이트합니다.
 */
export async function updateMessage(
  client: WebClient,
  channelId: string,
  ts: string,
  text: string,
  blocks?: unknown[]
): Promise<boolean> {
  try {
    await client.chat.update({
      channel: channelId,
      ts,
      text,
      blocks: blocks as never,
    });
    return true;
  } catch (error) {
    console.error('메시지 업데이트 실패:', error);
    return false;
  }
}

/**
 * 워크스페이스의 모든 멤버를 조회합니다.
 */
export async function getAllMembers(
  client: WebClient
): Promise<SlackUserProfile[]> {
  const members: SlackUserProfile[] = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await client.users.list({
        cursor,
        limit: 200,
      });

      for (const user of result.members || []) {
        // 봇과 삭제된 사용자 제외
        if (user.is_bot || user.deleted || !user.id) {
          continue;
        }

        members.push({
          userId: user.id,
          displayName: user.profile?.display_name || '',
          realName: user.profile?.real_name || '',
          email: user.profile?.email,
          imageUrl: user.profile?.image_192,
        });
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return members;
  } catch (error) {
    console.error('멤버 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 특정 채널의 멤버를 조회합니다.
 */
export async function getChannelMembers(
  client: WebClient,
  channelId: string
): Promise<string[]> {
  const memberIds: string[] = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await client.conversations.members({
        channel: channelId,
        cursor,
        limit: 200,
      });

      memberIds.push(...(result.members || []));
      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return memberIds;
  } catch (error) {
    console.error('채널 멤버 조회 실패:', error);
    return [];
  }
}

/**
 * 봇이 참여 가능한 공개 채널 목록을 조회합니다.
 */
export async function listPublicChannels(
  client: WebClient
): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await client.conversations.list({
        cursor,
        limit: 200,
        types: 'public_channel',
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

    return channels;
  } catch (error) {
    console.error('채널 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 이벤트 공지 메시지용 Block Kit 블록을 생성합니다.
 * @param event 이벤트 정보
 * @param responseOptions 응답 옵션 목록
 * @param responseCounts 옵션별 응답 수
 * @param allowMultipleSelection 중복 선택 허용 여부 (표시용으로 보관, 현재 미사용)
 * @param userId 현재 사용자 ID (표시용으로 보관, 현재 미사용 - 공지 메시지는 공유됨)
 * @param userSelections 현재 사용자의 선택 목록 (표시용으로 보관, 현재 미사용)
 */
export function buildEventAnnouncementBlocks(
  event: Event,
  responseOptions: EventResponseOption[],
  responseCounts?: Record<string, number>,
  allowMultipleSelection?: boolean,
  _userId?: string,
  _userSelections?: string[]
): unknown[] {
  const formattedDate = formatEventDateTimeForDisplay({
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    isMultiDay: event.isMultiDay,
    hasTime: event.hasTime,
    datetime: event.datetime,
  });

  // 응답 현황 텍스트 생성
  const sortedOptions = [...responseOptions].sort((a, b) => a.order - b.order);
  const statusParts = sortedOptions.map((opt) => {
    const count = responseCounts?.[opt.optionId] || 0;
    const emoji = opt.emoji || '';
    return `${emoji} ${opt.label}: ${count}명`;
  });
  let statusText = statusParts.join(' | ');
  if (allowMultipleSelection) {
    statusText += ' | (중복 선택 가능)';
  }

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

  // 설명이 있으면 추가
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
      elements: [
        ...sortedOptions.map((opt) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: `${opt.emoji || ''} ${opt.label}`.trim(),
            emoji: true,
          },
          value: `${event.eventId}:${opt.optionId}`,
          action_id: `event_response_${opt.optionId}`,
        })),
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '👥 응답자 보기',
            emoji: true,
          },
          value: event.eventId,
          action_id: 'view_respondents',
        },
      ],
    }
  );

  return blocks;
}

/**
 * 이벤트 공지 메시지를 채널에 전송합니다.
 */
export async function sendEventAnnouncement(
  client: WebClient,
  channelId: string,
  event: Event,
  responseOptions: EventResponseOption[]
): Promise<{ messageTs: string; channelName: string } | null> {
  try {
    // 먼저 봇이 채널에 참여
    await client.conversations.join({ channel: channelId });

    const blocks = buildEventAnnouncementBlocks(event, responseOptions);

    const result = await client.chat.postMessage({
      channel: channelId,
      text: `📅 이벤트 공지: ${event.title}`,
      blocks: blocks as never,
    });

    // 채널 정보 조회
    const channelInfo = await client.conversations.info({ channel: channelId });
    const channelName = channelInfo.channel?.name || '';

    return {
      messageTs: result.ts || '',
      channelName,
    };
  } catch (error) {
    console.error('이벤트 공지 전송 실패:', error);
    return null;
  }
}

/**
 * 응답자 보기 모달용 Block Kit 블록을 생성합니다.
 */
export function buildRespondentsModal(
  event: Event,
  rsvps: RSVP[]
): View {
  const responseOptions = event.announcement?.responseOptions || [];
  const sortedOptions = [...responseOptions].sort((a, b) => a.order - b.order);

  // 옵션별 응답자 그룹핑
  const respondentsByOption: Record<string, string[]> = {};

  // 모든 옵션에 대해 빈 배열로 초기화
  for (const opt of sortedOptions) {
    respondentsByOption[opt.optionId] = [];
  }

  // RSVP 데이터로 응답자 그룹핑
  for (const rsvp of rsvps) {
    // 중복 선택 모드인 경우 responseOptionIds 배열 사용
    if (rsvp.responseOptionIds && rsvp.responseOptionIds.length > 0) {
      for (const optionId of rsvp.responseOptionIds) {
        respondentsByOption[optionId]?.push(rsvp.memberId);
      }
    } else if (rsvp.responseOptionId) {
      // 단일 선택 모드
      respondentsByOption[rsvp.responseOptionId]?.push(rsvp.memberId);
    }
  }

  const blocks: View['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 응답 현황',
        emoji: true,
      },
    },
    { type: 'divider' },
  ];

  // 각 옵션별 응답자 섹션 추가
  for (const opt of sortedOptions) {
    const respondents = respondentsByOption[opt.optionId] || [];
    const emoji = opt.emoji || '';
    const label = opt.label;
    const count = respondents.length;

    // 옵션 헤더
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${emoji} ${label} (${count}명)*`,
      },
    });

    // 응답자 목록 (멘션 형식)
    if (respondents.length > 0) {
      const mentionText = respondents.map((id) => `<@${id}>`).join(' ');
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: mentionText,
          },
        ],
      });
    } else {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_응답자 없음_',
          },
        ],
      });
    }

    blocks.push({ type: 'divider' });
  }

  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: event.title.slice(0, 24), // 모달 제목 최대 24자
      emoji: true,
    },
    close: {
      type: 'plain_text',
      text: '닫기',
    },
    blocks,
  };
}
