/**
 * Settings API 핸들러
 *
 * GET /api/settings - 설정 조회
 * PUT /api/settings - 설정 변경
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { createResponse, createErrorResponse } from './index.js';
import { getSettings, updateSettings, saveLog } from '../../services/db.service.js';
import type { Settings } from '@baepdoongi/shared';

/**
 * /api/settings/* 라우터
 */
export async function handleSettings(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const { httpMethod } = event;

  // /api/settings
  if (subPath === '' || subPath === '/') {
    if (httpMethod === 'GET') {
      return getSettingsHandler();
    }

    if (httpMethod === 'PUT') {
      return updateSettingsHandler(event);
    }

    return createErrorResponse(405, `Method not allowed: ${httpMethod}`);
  }

  return createErrorResponse(404, `Unknown settings path: ${subPath}`);
}

/**
 * GET /api/settings - 설정 조회
 */
async function getSettingsHandler(): Promise<APIGatewayProxyResult> {
  const settings = await getSettings();
  return createResponse(200, settings);
}

/**
 * PUT /api/settings - 설정 변경
 */
async function updateSettingsHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createErrorResponse(400, '요청 본문이 필요합니다');
  }

  let body: Partial<Settings>;
  try {
    body = JSON.parse(event.body);
  } catch {
    return createErrorResponse(400, '유효하지 않은 JSON입니다');
  }

  // 현재 설정 조회 (변경 전 상태 로깅용)
  const previousSettings = await getSettings();

  // 설정 업데이트
  const updatedSettings = await updateSettings(body, 'dashboard');

  // 변경된 내용이 있으면 로그 기록
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (body.autoSendInviteEmail !== undefined &&
      body.autoSendInviteEmail !== previousSettings.autoSendInviteEmail) {
    changes['autoSendInviteEmail'] = {
      from: previousSettings.autoSendInviteEmail,
      to: body.autoSendInviteEmail,
    };
  }

  if (Object.keys(changes).length > 0) {
    await saveLog({
      logId: `log_${randomUUID()}`,
      type: 'SETTINGS_UPDATE',
      userId: 'dashboard',
      details: {
        changes,
      },
    });
  }

  return createResponse(200, updatedSettings);
}
