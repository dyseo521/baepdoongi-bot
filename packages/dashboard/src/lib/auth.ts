/**
 * 클라이언트 사이드 인증 유틸리티
 *
 * 정적 SPA에서 외부 API를 통한 인증 처리
 * 로컬 개발 환경에서는 폴백 인증을 사용합니다.
 */

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || '/api';

// 로컬 개발용 비밀번호 (API 미연결 시 사용)
const DEV_PASSWORD = process.env['NEXT_PUBLIC_DEV_PASSWORD'] || 'root';

// 로컬 세션 키 (localStorage)
const SESSION_KEY = 'baepdoongi_session';

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * 로그인 API 호출
 * API 연결 실패 또는 404 시 로컬 개발 모드로 폴백
 */
export async function login(password: string): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    // API가 없으면 (404) 로컬 모드로 폴백
    if (response.status === 404) {
      console.warn('[Auth] API 없음, 로컬 개발 모드 사용');
      return localLogin(password);
    }

    const data = await response.json();

    if (response.ok && data.success) {
      // API 로그인 성공 시 로컬 세션도 저장
      localStorage.setItem(SESSION_KEY, 'authenticated');
      return { success: true };
    }

    return {
      success: false,
      error: data.error || '로그인에 실패했습니다.',
    };
  } catch {
    // API 연결 실패 시 로컬 개발 모드
    console.warn('[Auth] API 연결 실패, 로컬 개발 모드 사용');
    return localLogin(password);
  }
}

/** 로컬 개발 모드 로그인 */
function localLogin(password: string): AuthResult {
  if (password === DEV_PASSWORD) {
    localStorage.setItem(SESSION_KEY, 'authenticated');
    return { success: true };
  }
  return { success: false, error: '비밀번호가 올바르지 않습니다.' };
}

/**
 * 로그아웃 API 호출
 */
export async function logout(): Promise<void> {
  // 로컬 세션 삭제
  localStorage.removeItem(SESSION_KEY);

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // 로그아웃 실패해도 무시
  }
}

/**
 * 인증 상태 확인 (API 호출로 확인)
 * API 연결 실패 또는 404 시 로컬 세션 확인
 */
export async function checkAuth(): Promise<boolean> {
  // 먼저 로컬 세션 확인 (빠른 응답)
  const localSession = localStorage.getItem(SESSION_KEY);

  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      credentials: 'include',
    });

    // API가 없으면 (404) 로컬 세션으로 폴백
    if (response.status === 404) {
      console.warn('[Auth] API 없음, 로컬 세션 확인');
      return localSession === 'authenticated';
    }

    if (response.ok) {
      // API 인증 성공 시 로컬 세션도 유지
      localStorage.setItem(SESSION_KEY, 'authenticated');
      return true;
    }

    // API 인증 실패 시 로컬 세션도 삭제
    localStorage.removeItem(SESSION_KEY);
    return false;
  } catch {
    // API 연결 실패 시 로컬 세션으로 폴백
    return localSession === 'authenticated';
  }
}
