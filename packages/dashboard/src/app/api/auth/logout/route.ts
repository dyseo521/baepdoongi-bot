import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
