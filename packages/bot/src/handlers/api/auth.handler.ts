/**
 * 인증 API 핸들러
 *
 * POST /api/auth/login - 로그인
 * POST /api/auth/logout - 로그아웃
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './index.js';
import { getSecrets } from '../../services/secrets.service.js';
import { randomBytes } from 'crypto';

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

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
  return ALLOWED_ORIGINS[0] ?? '';
}

/** 세션 토큰 생성 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** Set-Cookie 헤더 생성 (Cross-domain 지원) */
function createSetCookieHeader(token: string, maxAge: number): string {
  // Cross-domain 쿠키는 SameSite=None과 Secure가 필수
  return `baepdoongi_session=${token}; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}; Path=/`;
}

export async function handleAuth(
  event: APIGatewayProxyEvent,
  subPath: string
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const origin = event.headers['Origin'] || event.headers['origin'];

  // POST /api/auth/login
  if (subPath === '/login' && method === 'POST') {
    return handleLogin(event);
  }

  // POST /api/auth/logout
  if (subPath === '/logout' && method === 'POST') {
    return handleLogout(origin);
  }

  return createErrorResponse(404, 'Not found');
}

async function handleLogin(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = event.headers['Origin'] || event.headers['origin'];

  try {
    const body = JSON.parse(event.body || '{}');
    const { password } = body;

    if (!password) {
      return createErrorResponse(400, '비밀번호를 입력해주세요');
    }

    // Secrets Manager에서 관리자 비밀번호 가져오기
    const secrets = await getSecrets();
    const adminPassword = secrets.ADMIN_PASSWORD || 'igrus';

    // 인증 검증
    if (password === adminPassword) {
      const sessionToken = generateSessionToken();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getAllowedOrigin(origin),
          'Access-Control-Allow-Credentials': 'true',
          'Set-Cookie': createSetCookieHeader(sessionToken, SESSION_DURATION),
        },
        body: JSON.stringify({ success: true }),
      };
    }

    return createErrorResponse(401, '비밀번호가 올바르지 않습니다');
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return createErrorResponse(500, '서버 오류가 발생했습니다');
  }
}

function handleLogout(origin: string | undefined): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(origin),
      'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': createSetCookieHeader('', 0), // 쿠키 삭제
    },
    body: JSON.stringify({ success: true }),
  };
}
