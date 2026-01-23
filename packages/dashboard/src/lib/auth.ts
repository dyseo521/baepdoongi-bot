import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'baepdoongi_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Hardcoded credentials
const VALID_CREDENTIALS = {
  username: 'root',
  password: 'root',
};

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function login(username: string, password: string): Promise<AuthResult> {
  if (
    username === VALID_CREDENTIALS.username &&
    password === VALID_CREDENTIALS.password
  ) {
    const cookieStore = await cookies();
    const sessionToken = generateSessionToken();

    cookieStore.set(AUTH_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: '/',
    });

    return { success: true };
  }

  return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME);
  return !!session?.value;
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
