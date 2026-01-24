/**
 * 구글 시트 연동
 *
 * 구글 폼 응답이 저장된 구글 시트에서 지원서 데이터를 가져옵니다.
 * TODO: Google Sheets API 연동 구현
 */

import type { CreateSubmissionInput } from '@baepdoongi/shared';

interface GoogleSheetRow {
  timestamp: string;
  name: string;
  studentId: string;
  email: string;
  department?: string;
  phone?: string;
  [key: string]: string | undefined;
}

/**
 * 구글 시트에서 새로운 지원서를 가져옵니다.
 *
 * @param lastSyncTimestamp 마지막 동기화 시각 (이후 데이터만 가져옴)
 * @returns 새로운 지원서 목록
 */
export async function fetchNewSubmissionsFromSheet(
  lastSyncTimestamp?: string
): Promise<CreateSubmissionInput[]> {
  // TODO: Google Sheets API 연동 구현
  // 1. 서비스 계정 인증
  // 2. 시트 데이터 읽기
  // 3. 마지막 동기화 이후 데이터 필터링
  // 4. CreateSubmissionInput 형식으로 변환

  console.log('[GoogleSheets] Fetching new submissions since:', lastSyncTimestamp);

  // 더미 데이터 반환 (개발용)
  return [];
}

/**
 * 구글 시트 행을 지원서 입력 형식으로 변환합니다.
 */
export function rowToSubmissionInput(row: GoogleSheetRow): CreateSubmissionInput {
  const input: CreateSubmissionInput = {
    name: row.name.trim(),
    studentId: row.studentId.replace(/\D/g, ''), // 숫자만 추출
    email: row.email.trim().toLowerCase(),
    metadata: {
      rawTimestamp: row.timestamp,
      // 추가 필드들
    },
  };

  if (row.department) {
    input.department = row.department.trim();
  }
  if (row.phone) {
    input.phone = row.phone.replace(/\D/g, ''); // 숫자만 추출
  }

  return input;
}

/**
 * 학번 형식을 검증합니다.
 */
export function validateStudentId(studentId: string): boolean {
  // 8자리 숫자 형식 검증
  return /^\d{8}$/.test(studentId);
}

/**
 * 이메일 형식을 검증합니다.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 지원서 데이터를 검증합니다.
 */
export function validateSubmissionInput(
  input: CreateSubmissionInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || input.name.length < 2) {
    errors.push('이름은 2자 이상이어야 합니다');
  }

  if (!validateStudentId(input.studentId)) {
    errors.push('학번은 8자리 숫자여야 합니다');
  }

  if (input.email && !validateEmail(input.email)) {
    errors.push('올바른 이메일 형식이 아닙니다');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
