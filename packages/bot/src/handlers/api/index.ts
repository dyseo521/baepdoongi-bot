/**
 * Dashboard API 라우터
 *
 * API Gateway에서 /api/* 경로로 들어온 요청을 처리합니다.
 * Lambda 환경에서 Slack Bolt와 별개로 직접 HTTP 요청을 처리합니다.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleAuth } from './auth.handler.js';
import { handleMembers } from './members.handler.js';
import { handleEvents } from './events.handler.js';
import { handleLogs } from './logs.handler.js';
import { handleStats, handleStatsTrends } from './stats.handler.js';
import { handleSuggestions } from './suggestions.handler.js';
import { handleSlackChannels } from './slack-channels.handler.js';
import { handlePayments } from './payments.handler.js';

// 허용된 CORS Origin 목록
const ALLOWED_ORIGINS = [
  'https://d3qp8nmugde8u1.cloudfront.net',
  'http://localhost:3001',
  'http://localhost:3000',
];

/** 요청 Origin 검증 및 반환 */
function getAllowedOrigin(requestOrigin: string | undefined): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  // 기본값: CloudFront 도메인
  return ALLOWED_ORIGINS[0] ?? '';
}

// 현재 요청의 Origin을 저장 (createResponse에서 사용)
let currentRequestOrigin: string | undefined;

/** 요청 Origin 설정 (라우터에서 호출) */
export function setRequestOrigin(origin: string | undefined): void {
  currentRequestOrigin = origin;
}

/** API 응답 생성 헬퍼 */
export function createResponse(
  statusCode: number,
  body: unknown,
  additionalHeaders?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(currentRequestOrigin),
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      ...additionalHeaders,
    },
    body: JSON.stringify(body),
  };
}

/** 에러 응답 생성 */
export function createErrorResponse(
  statusCode: number,
  error: string
): APIGatewayProxyResult {
  return createResponse(statusCode, { error });
}

/** 쿠키 파싱 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });

  return cookies;
}

/** 인증 검증 */
export function verifyAuth(event: APIGatewayProxyEvent): boolean {
  const cookies = parseCookies(event.headers['Cookie'] || event.headers['cookie']);
  const sessionToken = cookies['baepdoongi_session'];

  // 세션 토큰이 존재하면 인증됨으로 간주
  return !!sessionToken;
}

/**
 * API 요청 라우터
 */
export async function handleApiRequest(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, headers } = event;

  // 요청 Origin 설정 (CORS 응답용)
  setRequestOrigin(headers['Origin'] || headers['origin']);

  // CORS preflight 처리
  if (httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  console.log(`[API] ${httpMethod} ${path}`);

  // 경로 파싱 (/api/... 에서 /api 제거)
  const apiPath = path.replace(/^\/api/, '');

  try {
    // /api/auth/* - 인증 불필요
    if (apiPath.startsWith('/auth')) {
      return await handleAuth(event, apiPath.replace('/auth', ''));
    }

    // 인증 필요한 엔드포인트
    if (!verifyAuth(event)) {
      return createErrorResponse(401, '인증이 필요합니다');
    }

    // /api/members/*
    if (apiPath.startsWith('/members')) {
      return await handleMembers(event, apiPath.replace('/members', ''));
    }

    // /api/events/*
    if (apiPath.startsWith('/events')) {
      return await handleEvents(event, apiPath.replace('/events', ''));
    }

    // /api/logs
    if (apiPath.startsWith('/logs')) {
      return await handleLogs(event);
    }

    // /api/stats/trends
    if (apiPath === '/stats/trends') {
      return await handleStatsTrends(event);
    }

    // /api/stats
    if (apiPath === '/stats') {
      return await handleStats(event);
    }

    // /api/suggestions/*
    if (apiPath.startsWith('/suggestions')) {
      return await handleSuggestions(event, apiPath.replace('/suggestions', ''));
    }

    // /api/slack/channels
    if (apiPath.startsWith('/slack/channels')) {
      return await handleSlackChannels(event);
    }

    // /api/payments/*
    if (apiPath.startsWith('/payments')) {
      return await handlePayments(event, apiPath.replace('/payments', ''));
    }

    // 404 Not Found
    return createErrorResponse(404, `Unknown API path: ${apiPath}`);
  } catch (error) {
    console.error('[API] Error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
