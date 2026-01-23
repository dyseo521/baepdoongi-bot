/**
 * 이벤트 RSVP 액션 핸들러
 *
 * 이벤트 참석/불참 버튼 클릭을 처리합니다.
 */

import type { AllMiddlewareArgs, SlackActionMiddlewareArgs, BlockAction, ButtonAction } from '@slack/bolt';
import { saveRSVP, getEvent, getEventRSVPs, saveLog } from '../../services/db.service.js';
import { generateId } from '../../utils/id.js';

export async function handleEventRSVP({
  ack,
  body,
  action,
  client,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();

  const userId = body.user.id;
  const actionId = action.action_id;
  const eventId = action.value || '';

  if (!eventId) {
    console.error('이벤트 ID가 없습니다.');
    return;
  }

  // 참석/불참 여부 판단
  const status = actionId === 'event_rsvp_attend' ? 'attending' : 'absent';
  const statusEmoji = status === 'attending' ? '✅' : '❌';
  const statusText = status === 'attending' ? '참석' : '불참';

  try {
    // 이벤트 정보 조회
    const event = await getEvent(eventId);
    if (!event) {
      console.error(`이벤트를 찾을 수 없습니다: ${eventId}`);
      return;
    }

    // RSVP 저장
    await saveRSVP({
      eventId,
      memberId: userId,
      status,
      respondedAt: new Date().toISOString(),
    });

    // 현재 참석/불참 현황 조회
    const rsvps = await getEventRSVPs(eventId);
    const attendingCount = rsvps.filter((r) => r.status === 'attending').length;
    const absentCount = rsvps.filter((r) => r.status === 'absent').length;

    // 원본 메시지 업데이트
    if ('channel' in body && body.channel && 'message' in body && body.message) {
      const message = body.message;

      // 기존 블록에서 버튼 섹션 찾아서 현황 업데이트
      const updatedBlocks = (message.blocks || []).map((block: Record<string, unknown>) => {
        if (block['type'] === 'context' && Array.isArray(block['elements'])) {
          // 참석 현황 컨텍스트 업데이트
          return {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `✅ 참석: ${attendingCount}명 | ❌ 불참: ${absentCount}명`,
              },
            ],
          };
        }
        return block;
      });

      await client.chat.update({
        channel: body.channel.id,
        ts: message.ts as string,
        blocks: updatedBlocks,
        text: `이벤트: ${event.title}`,
      });
    }

    // 사용자에게 확인 메시지 (ephemeral)
    if ('channel' in body && body.channel) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: `${statusEmoji} "${event.title}" 이벤트에 ${statusText}으로 응답했습니다.`,
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
        status,
      },
    });

    console.log(`이벤트 RSVP: ${userId} -> ${eventId} (${status})`);
  } catch (error) {
    console.error('RSVP 처리 실패:', error);
  }
}
