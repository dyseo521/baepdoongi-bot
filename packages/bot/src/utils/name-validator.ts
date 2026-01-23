/**
 * 이름 형식 검증 유틸리티
 *
 * Slack 프로필 표시 이름이 동아리 규칙에 맞는지 검증합니다.
 * 규칙: "이름/학과/학번" 형식 (예: 홍길동/컴퓨터공학과/20)
 */

/**
 * 이름 형식 검증 정규식
 *
 * 패턴: "이름/학과/학번" 또는 "이름 / 학과 / 학번" (슬래시 주변 공백 허용)
 * - 이름: 한글 2-5자
 * - 학과: 한글 2-20자 (학과, 학부, 전공 등)
 * - 학번: 2자리 숫자 (예: 20, 21, 22)
 */
const NAME_PATTERN = /^[가-힣]{2,5}\s*\/\s*[가-힣]{2,20}(?:학과|학부|전공)?\s*\/\s*\d{2}$/;

/**
 * 좀 더 유연한 패턴 (학과 이름에 영문/숫자/공백 허용)
 * 예: 홍길동/SW융합학부/20, 홍길동/AI학과/21, 홍길동 / 컴퓨터공학과 / 24
 */
const FLEXIBLE_PATTERN = /^[가-힣]{2,5}\s*\/\s*[가-힣A-Za-z0-9\s]{2,20}(?:학과|학부|전공)?\s*\/\s*\d{2}$/;

/**
 * 표시 이름이 규칙에 맞는지 검증합니다.
 *
 * @param displayName - Slack 프로필 표시 이름
 * @returns 규칙 준수 여부
 */
export function validateDisplayName(displayName: string): boolean {
  if (!displayName || displayName.trim() === '') {
    return false;
  }

  const trimmed = displayName.trim();

  // 엄격한 패턴 또는 유연한 패턴 중 하나라도 통과하면 유효
  return NAME_PATTERN.test(trimmed) || FLEXIBLE_PATTERN.test(trimmed);
}

/**
 * 이름 형식 검증 실패 시 상세 피드백을 반환합니다.
 *
 * @param displayName - Slack 프로필 표시 이름
 * @returns 피드백 메시지 또는 null (유효한 경우)
 */
export function getNameValidationFeedback(displayName: string): string | null {
  if (!displayName || displayName.trim() === '') {
    return '표시 이름이 비어있습니다. "이름/학과/학번" 형식으로 설정해주세요.';
  }

  const trimmed = displayName.trim();

  // 이미 유효한 경우
  if (validateDisplayName(trimmed)) {
    return null;
  }

  // 슬래시(/) 개수 확인
  const slashCount = (trimmed.match(/\//g) || []).length;
  if (slashCount < 2) {
    return '슬래시(/)가 부족합니다. "이름/학과/학번" 형식으로 입력해주세요.';
  }
  if (slashCount > 2) {
    return '슬래시(/)가 너무 많습니다. "이름/학과/학번" 형식으로 입력해주세요.';
  }

  // 각 부분 분석
  const parts = trimmed.split('/');
  const [name, department, studentId] = parts;

  // 이름 검증
  if (!name || !/^[가-힣]{2,5}$/.test(name)) {
    return '이름은 한글 2-5자로 입력해주세요.';
  }

  // 학과 검증
  if (!department || department.length < 2) {
    return '학과명이 너무 짧습니다.';
  }

  // 학번 검증
  if (!studentId || !/^\d{2}$/.test(studentId)) {
    return '학번은 2자리 숫자로 입력해주세요. (예: 20, 21)';
  }

  return '형식이 올바르지 않습니다. "이름/학과/학번" 형식으로 입력해주세요. (예: 홍길동/컴퓨터공학과/20)';
}

/**
 * 표시 이름에서 이름 부분만 추출합니다.
 */
export function extractName(displayName: string): string | null {
  if (!validateDisplayName(displayName)) {
    return null;
  }
  return displayName.split('/')[0] || null;
}

/**
 * 표시 이름에서 학과 부분만 추출합니다.
 */
export function extractDepartment(displayName: string): string | null {
  if (!validateDisplayName(displayName)) {
    return null;
  }
  return displayName.split('/')[1] || null;
}

/**
 * 표시 이름에서 학번 부분만 추출합니다.
 */
export function extractStudentId(displayName: string): string | null {
  if (!validateDisplayName(displayName)) {
    return null;
  }
  return displayName.split('/')[2] || null;
}
