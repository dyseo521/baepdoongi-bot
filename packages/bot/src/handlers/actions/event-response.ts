/**
 * 동적 이벤트 응답 액션 핸들러
 *
 * Slack 공지에서 커스텀 응답 버튼 클릭을 처리합니다.
 * action_id 패턴: event_response_{optionId}
 * value 형식: {eventId}:{optionId}
 */

import type { AllMiddlewareArgs, SlackActionMiddlewareArgs, BlockAction, ButtonAction } from '@slack/bolt';
import { saveRSVP, getEvent, getEventRSVPs, saveLog, saveEvent } from '../../services/db.service.js';
import { buildEventAnnouncementBlocks } from '../../services/slack.service.js';
import { generateId } from '../../utils/id.js';
import type { RSVPStatus } from '@baepdoongi/shared';

/**
 * optionId를 RSVPStatus로 매핑합니다.
 */
function mapOptionIdToStatus(optionId: string): RSVPStatus {
  switch (optionId) {
    case 'attend':
    case 'online':
      return 'attending';
    case 'absent':
      return 'absent';
    case 'late':
    case 'maybe':
      return 'maybe';
    default:
      return 'maybe';
  }
}

export async function handleEventResponse({
  ack,
  body,
  action,
  client,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();

  const userId = body.user.id;
  const value = action.value || '';

  // value 형식: {eventId}:{optionId}
  const [eventId, optionId] = value.split(':');

  if (!eventId || !optionId) {
    console.error('잘못된 응답 값:', value);
    return;
  }

  try {
    // 이벤트 정보 조회
    const event = await getEvent(eventId);
    if (!event) {
      console.error(`이벤트를 찾을 수 없습니다: ${eventId}`);
      return;
    }

    // 이벤트의 공지 정보에서 응답 옵션 확인
    if (!event.announcement?.responseOptions) {
      console.error(`이벤트에 공지 정보가 없습니다: ${eventId}`);
      return;
    }

    const responseOption = event.announcement.responseOptions.find(
      (opt) => opt.optionId === optionId
    );

    if (!responseOption) {
      console.error(`유효하지 않은 응답 옵션: ${optionId}`);
      return;
    }

    // RSVPStatus로 변환
    const status = mapOptionIdToStatus(optionId);

    // RSVP 저장
    await saveRSVP({
      eventId,
      memberId: userId,
      status,
      respondedAt: new Date().toISOString(),
      responseOptionId: optionId,
    });

    // 현재 응답 현황 집계
    const rsvps = await getEventRSVPs(eventId);
    const responseCounts: Record<string, number> = {};

    for (const rsvp of rsvps) {
      const rsvpOptionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
      responseCounts[rsvpOptionId] = (responseCounts[rsvpOptionId] || 0) + 1;
    }

    // 원본 메시지 업데이트
    if ('channel' in body && body.channel && 'message' in body && body.message) {
      const updatedBlocks = buildEventAnnouncementBlocks(
        event,
        event.announcement.responseOptions,
        responseCounts
      );

      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts as string,
        blocks: updatedBlocks as never,
        text: `📅 이벤트 공지: ${event.title}`,
      });
    }

    // 사용자에게 확인 메시지 (ephemeral)
    const optionEmoji = responseOption.emoji || '';
    const optionLabel = responseOption.label;

    if ('channel' in body && body.channel) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: `${optionEmoji} "${event.title}" 이벤트에 "${optionLabel}"(으)로 응답했습니다.`,
      });
    }

    // 활동 로그 기록
    await saveLog({
      logId: generateId('log'),
      type: 'EVENT_RSVP',
      userId,
      details: {
        eventId,
        eventTitle: event.title,
        optionId,
        optionLabel,
        status,
      },
    });

    console.log(`이벤트 응답: ${userId} -> ${eventId} (${optionId}: ${optionLabel})`);
  } catch (error) {
    console.error('이벤트 응답 처리 실패:', error);
  }
}
