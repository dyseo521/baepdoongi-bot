/**
 * 동적 이벤트 응답 액션 핸들러
 *
 * Slack 공지에서 커스텀 응답 버튼 클릭을 처리합니다.
 * action_id 패턴: event_response_{optionId}
 * value 형식: {eventId}:{optionId}
 */

import type {
  AllMiddlewareArgs,
  SlackActionMiddlewareArgs,
  SlackViewMiddlewareArgs,
  BlockAction,
  ButtonAction,
  ViewSubmitAction,
} from '@slack/bolt';
import { saveRSVP, getEvent, getEventRSVPs, getRSVP, saveLog } from '../../services/db.service.js';
import { buildEventAnnouncementBlocks, buildRespondentsModal } from '../../services/slack.service.js';
import { generateId } from '../../utils/id.js';
import type { RSVPStatus, EventResponseOption, RSVP, Event } from '@baepdoongi/shared';

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

/**
 * 다중 선택에서 RSVPStatus 결정
 * - 참석 계열(attend, online)이 포함되면 attending
 * - 불참(absent)만 있으면 absent
 * - 그 외(늦참, maybe 등)면 maybe
 */
function mapMultipleOptionsToStatus(optionIds: string[]): RSVPStatus {
  if (optionIds.includes('attend') || optionIds.includes('online')) {
    return 'attending';
  }
  if (optionIds.includes('absent') && optionIds.length === 1) {
    return 'absent';
  }
  return 'maybe';
}

/**
 * 응답 현황 집계 (중복 선택 지원)
 */
function countResponses(rsvps: RSVP[]): Record<string, number> {
  const responseCounts: Record<string, number> = {};

  for (const rsvp of rsvps) {
    // 중복 선택 모드인 경우 responseOptionIds 배열 사용
    if (rsvp.responseOptionIds && rsvp.responseOptionIds.length > 0) {
      for (const id of rsvp.responseOptionIds) {
        responseCounts[id] = (responseCounts[id] || 0) + 1;
      }
    } else {
      // 단일 선택 모드
      const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
      responseCounts[optionId] = (responseCounts[optionId] || 0) + 1;
    }
  }

  return responseCounts;
}

interface ProcessRSVPResult {
  success: boolean;
  event?: Event;
  responseOption?: EventResponseOption;
  isToggleOff?: boolean;
  currentSelections?: string[];
}

/**
 * RSVP 저장 및 메시지 업데이트 공통 로직
 */
async function processRSVP({
  eventId,
  optionId,
  userId,
  inputValue,
  channelId,
  messageTs,
  client,
}: {
  eventId: string;
  optionId: string;
  userId: string;
  inputValue?: string;
  channelId?: string;
  messageTs?: string;
  client: AllMiddlewareArgs['client'];
}): Promise<ProcessRSVPResult> {
  // 이벤트 정보 조회
  const event = await getEvent(eventId);
  if (!event) {
    console.error(`이벤트를 찾을 수 없습니다: ${eventId}`);
    return { success: false };
  }

  // 이벤트의 공지 정보에서 응답 옵션 확인
  if (!event.announcement?.responseOptions) {
    console.error(`이벤트에 공지 정보가 없습니다: ${eventId}`);
    return { success: false };
  }

  const responseOption = event.announcement.responseOptions.find(
    (opt) => opt.optionId === optionId
  );

  if (!responseOption) {
    console.error(`유효하지 않은 응답 옵션: ${optionId}`);
    return { success: false };
  }

  const allowMultipleSelection = event.announcement.allowMultipleSelection || false;
  let isToggleOff = false;
  let currentSelections: string[] = [];

  if (allowMultipleSelection) {
    // 중복 선택 모드: 토글 로직
    const existingRSVP = await getRSVP(eventId, userId);

    if (existingRSVP) {
      // 기존 선택 목록 가져오기 (responseOptionIds 우선, 없으면 responseOptionId 사용)
      const currentIds = existingRSVP.responseOptionIds ||
        (existingRSVP.responseOptionId ? [existingRSVP.responseOptionId] : []);

      if (currentIds.includes(optionId)) {
        // 이미 선택된 옵션: 제거 (토글 OFF)
        const newIds = currentIds.filter(id => id !== optionId);
        isToggleOff = true;
        currentSelections = newIds;

        if (newIds.length === 0) {
          // 모든 선택이 해제되면 기본 상태로 저장 (빈 배열)
          await saveRSVP({
            eventId,
            memberId: userId,
            status: 'maybe',
            respondedAt: new Date().toISOString(),
            responseOptionIds: [],
          });
        } else {
          // 선택 목록 업데이트
          const status = mapMultipleOptionsToStatus(newIds);
          await saveRSVP({
            eventId,
            memberId: userId,
            status,
            respondedAt: new Date().toISOString(),
            responseOptionIds: newIds,
          });
        }
      } else {
        // 새로운 옵션 추가 (토글 ON)
        const newIds = [...currentIds, optionId];
        currentSelections = newIds;
        const status = mapMultipleOptionsToStatus(newIds);

        await saveRSVP({
          eventId,
          memberId: userId,
          status,
          respondedAt: new Date().toISOString(),
          responseOptionIds: newIds,
          ...(inputValue && { inputValue }),
        });
      }
    } else {
      // 첫 응답
      currentSelections = [optionId];
      const status = mapOptionIdToStatus(optionId);

      await saveRSVP({
        eventId,
        memberId: userId,
        status,
        respondedAt: new Date().toISOString(),
        responseOptionIds: [optionId],
        ...(inputValue && { inputValue }),
      });
    }
  } else {
    // 단일 선택 모드: 기존 로직 유지
    const status = mapOptionIdToStatus(optionId);

    await saveRSVP({
      eventId,
      memberId: userId,
      status,
      respondedAt: new Date().toISOString(),
      responseOptionId: optionId,
      ...(inputValue && { inputValue }),
    });
  }

  // 현재 응답 현황 집계
  const rsvps = await getEventRSVPs(eventId);
  const responseCounts = countResponses(rsvps);

  // 원본 메시지 업데이트
  const updateChannelId = channelId || event.announcement.channelId;
  const updateMessageTs = messageTs || event.announcement.messageTs;

  if (updateChannelId && updateMessageTs) {
    // 중복 선택 모드일 때 현재 사용자의 선택 정보도 전달
    const userSelections = allowMultipleSelection ? currentSelections : undefined;

    const updatedBlocks = buildEventAnnouncementBlocks(
      event,
      event.announcement.responseOptions,
      responseCounts,
      allowMultipleSelection,
      userId,
      userSelections
    );

    await client.chat.update({
      channel: updateChannelId,
      ts: updateMessageTs,
      blocks: updatedBlocks as never,
      text: `📅 이벤트 공지: ${event.title}`,
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
      optionLabel: responseOption.label,
      status: allowMultipleSelection ? mapMultipleOptionsToStatus(currentSelections) : mapOptionIdToStatus(optionId),
      isToggleOff,
      allowMultipleSelection,
      currentSelections: allowMultipleSelection ? currentSelections : undefined,
      ...(inputValue && { inputValue }),
    },
  });

  console.log(`이벤트 응답: ${userId} -> ${eventId} (${optionId}: ${responseOption.label})${isToggleOff ? ' [해제]' : ''}${inputValue ? ` [입력: ${inputValue}]` : ''}`);

  return { success: true, event, responseOption, isToggleOff, currentSelections };
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
    // 이벤트 정보 조회하여 requiresInput 확인
    const event = await getEvent(eventId);
    if (!event || !event.announcement?.responseOptions) {
      console.error(`이벤트를 찾을 수 없습니다: ${eventId}`);
      return;
    }

    const responseOption = event.announcement.responseOptions.find(
      (opt) => opt.optionId === optionId
    );

    if (!responseOption) {
      console.error(`유효하지 않은 응답 옵션: ${optionId}`);
      return;
    }

    // requiresInput이 true면 모달 열기
    if (responseOption.requiresInput) {
      const channelId = 'channel' in body && body.channel ? body.channel.id : '';
      const messageTs = 'message' in body && body.message ? body.message.ts as string : '';

      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'event_response_input_modal',
          private_metadata: JSON.stringify({ eventId, optionId, channelId, messageTs }),
          title: {
            type: 'plain_text',
            text: responseOption.label,
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📅 *${event.title}*에 *${responseOption.emoji || ''} ${responseOption.label}*(으)로 응답합니다.`,
              },
            },
            {
              type: 'input',
              block_id: 'input_block',
              element: {
                type: 'plain_text_input',
                action_id: 'user_input',
                placeholder: {
                  type: 'plain_text',
                  text: responseOption.inputPlaceholder || '내용을 입력해주세요',
                },
                multiline: true,
              },
              label: {
                type: 'plain_text',
                text: responseOption.inputLabel || '추가 입력',
              },
            },
          ],
          submit: {
            type: 'plain_text',
            text: '제출',
          },
          close: {
            type: 'plain_text',
            text: '취소',
          },
        },
      });
      return;
    }

    // requiresInput이 false면 바로 RSVP 처리
    const channelId = 'channel' in body && body.channel ? body.channel.id : undefined;
    const messageTs = 'message' in body && body.message ? body.message.ts as string : undefined;

    const result = await processRSVP({
      eventId,
      optionId,
      userId,
      channelId,
      messageTs,
      client,
    });

    // 사용자에게 확인 메시지 (ephemeral)
    if (result.success && result.event && result.responseOption && channelId) {
      const optionEmoji = result.responseOption.emoji || '';
      const optionLabel = result.responseOption.label;
      const allowMultiple = result.event.announcement?.allowMultipleSelection || false;

      let message: string;
      if (allowMultiple) {
        if (result.isToggleOff) {
          message = `${optionEmoji} "${result.event.title}" 이벤트에서 "${optionLabel}" 선택을 해제했습니다.`;
        } else if (result.currentSelections && result.currentSelections.length > 1) {
          const selectedLabels = result.currentSelections
            .map(id => result.event!.announcement!.responseOptions.find(opt => opt.optionId === id))
            .filter(Boolean)
            .map(opt => `${opt!.emoji || ''} ${opt!.label}`)
            .join(', ');
          message = `"${result.event.title}" 이벤트에 ${selectedLabels}(으)로 응답 중입니다.`;
        } else {
          message = `${optionEmoji} "${result.event.title}" 이벤트에 "${optionLabel}"(으)로 응답했습니다.`;
        }
      } else {
        message = `${optionEmoji} "${result.event.title}" 이벤트에 "${optionLabel}"(으)로 응답했습니다.`;
      }

      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: message,
      });
    }
  } catch (error) {
    console.error('이벤트 응답 처리 실패:', error);
  }
}

/**
 * 텍스트 입력 모달 제출 핸들러
 */
export async function handleEventResponseInputSubmit({
  ack,
  body,
  view,
  client,
}: AllMiddlewareArgs & SlackViewMiddlewareArgs<ViewSubmitAction>): Promise<void> {
  await ack();

  const userId = body.user.id;

  try {
    // private_metadata에서 이벤트 정보 추출
    const metadata = JSON.parse(view.private_metadata || '{}') as {
      eventId?: string;
      optionId?: string;
      channelId?: string;
      messageTs?: string;
    };

    const { eventId, optionId, channelId, messageTs } = metadata;

    if (!eventId || !optionId) {
      console.error('모달 메타데이터 누락:', metadata);
      return;
    }

    // 사용자 입력 값 추출
    const inputValue = view.state.values['input_block']?.['user_input']?.value || '';

    // RSVP 처리
    const result = await processRSVP({
      eventId,
      optionId,
      userId,
      inputValue,
      channelId,
      messageTs,
      client,
    });

    // 사용자에게 확인 메시지 (ephemeral - 채널에서 본인만 보이는 메시지)
    if (result.success && result.event && result.responseOption && channelId) {
      const optionEmoji = result.responseOption.emoji || '';
      const optionLabel = result.responseOption.label;

      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: `${optionEmoji} "${result.event.title}" 이벤트에 "${optionLabel}"(으)로 응답했습니다.${inputValue ? `\n> ${inputValue}` : ''}`,
      });
    }
  } catch (error) {
    console.error('이벤트 응답 모달 처리 실패:', error);
  }
}

/**
 * 응답자 보기 버튼 핸들러
 */
export async function handleViewRespondents({
  ack,
  body,
  client,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>): Promise<void> {
  await ack();

  try {
    const action = body.actions[0];
    if (!action || action.type !== 'button') {
      return;
    }

    const eventId = action.value;
    if (!eventId) {
      console.error('이벤트 ID가 없습니다.');
      return;
    }

    // 이벤트 정보와 RSVP 목록 조회
    const [event, rsvps] = await Promise.all([
      getEvent(eventId),
      getEventRSVPs(eventId),
    ]);

    if (!event) {
      console.error(`이벤트를 찾을 수 없습니다: ${eventId}`);
      return;
    }

    // 모달 생성 및 열기
    const modal = buildRespondentsModal(event, rsvps);

    await client.views.open({
      trigger_id: body.trigger_id,
      view: modal,
    });
  } catch (error) {
    console.error('응답자 보기 모달 처리 실패:', error);
  }
}
