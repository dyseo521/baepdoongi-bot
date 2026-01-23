/**
 * 건의사항 API
 */

import { NextResponse } from 'next/server';
import { getAllSuggestions, saveActivityLog } from '@/lib/db';

/**
 * GET /api/suggestions
 * 모든 건의사항 조회
 */
export async function GET() {
  try {
    const suggestions = await getAllSuggestions();
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('건의사항 조회 실패:', error);
    return NextResponse.json(
      { error: '건의사항을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
