/**
 * 매칭 알고리즘
 *
 * 입금 알림과 구글 폼 지원서를 매칭하는 알고리즘입니다.
 */

import type { Submission, MatchingInput, MatchingResult } from '@baepdoongi/shared';

/** 자동 매칭 허용 시간 (분) */
const AUTO_MATCH_TIME_LIMIT_MINUTES = 180; // 3시간

/**
 * 입금자명에서 이름과 숫자를 분리합니다.
 */
export function parseDepositorName(depositorName: string): {
  name: string;
  suffix: string | null;
} {
  // 이름 뒤의 숫자 추출 (예: "서동윤23" → "서동윤", "23")
  const match = depositorName.match(/^(.+?)(\d+)?$/);
  if (!match || !match[1]) {
    return { name: depositorName, suffix: null };
  }
  return {
    name: match[1],
    suffix: match[2] ?? null,
  };
}

/**
 * 학번 끝자리가 일치하는지 확인합니다.
 */
export function matchStudentIdSuffix(studentId: string, suffix: string): boolean {
  return studentId.endsWith(suffix);
}

/**
 * 두 시각 사이의 차이를 분 단위로 계산합니다.
 */
export function getTimeDifferenceMinutes(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * 매칭 알고리즘을 실행합니다.
 */
export function runMatchingAlgorithm(
  input: MatchingInput,
  pendingSubmissions: Submission[]
): MatchingResult {
  const { depositorName, depositTimestamp } = input;
  const { name, suffix } = parseDepositorName(depositorName);

  // 1. 이름이 일치하는 지원서 검색
  const nameMatches = pendingSubmissions.filter((sub) => sub.name === name);

  // 2. 일치 결과 처리
  if (nameMatches.length === 0) {
    return {
      success: false,
      type: 'manual_required',
      confidence: 0,
      reason: `이름 "${name}"과 일치하는 지원서가 없습니다`,
      candidates: [],
    };
  }

  if (nameMatches.length === 1) {
    const submission = nameMatches[0]!;
    const submittedAt = new Date(submission.submittedAt);
    const timeDiff = getTimeDifferenceMinutes(depositTimestamp, submittedAt);

    // 숫자가 있으면 학번 검증
    let studentIdMatch = true;
    if (suffix) {
      studentIdMatch = matchStudentIdSuffix(submission.studentId, suffix);
    }

    // 시간 검증
    const withinTimeLimit = timeDiff <= AUTO_MATCH_TIME_LIMIT_MINUTES;

    // 신뢰도 계산
    let confidence = 50; // 기본 (이름 일치)
    if (studentIdMatch && suffix) confidence += 30; // 학번 끝자리 일치
    if (withinTimeLimit) confidence += 20; // 시간 내

    if (withinTimeLimit && studentIdMatch) {
      return {
        success: true,
        type: 'auto',
        submission,
        confidence,
        reason: suffix
          ? `이름 일치 + 학번 끝자리(${suffix}) 일치 + 시간 차이 ${timeDiff}분`
          : `이름 일치 + 시간 차이 ${timeDiff}분`,
        timeDifferenceMinutes: timeDiff,
      };
    } else {
      return {
        success: false,
        type: 'manual_required',
        submission,
        confidence,
        reason: !withinTimeLimit
          ? `시간 차이 ${timeDiff}분 (${AUTO_MATCH_TIME_LIMIT_MINUTES}분 초과)`
          : `학번 끝자리 불일치`,
        timeDifferenceMinutes: timeDiff,
        candidates: [submission],
      };
    }
  }

  // 3. 동명이인 처리 (2명 이상)
  if (suffix) {
    // 숫자로 학번 구분 시도
    const studentIdMatches = nameMatches.filter((sub) =>
      matchStudentIdSuffix(sub.studentId, suffix)
    );

    if (studentIdMatches.length === 1) {
      const submission = studentIdMatches[0]!;
      const submittedAt = new Date(submission.submittedAt);
      const timeDiff = getTimeDifferenceMinutes(depositTimestamp, submittedAt);
      const withinTimeLimit = timeDiff <= AUTO_MATCH_TIME_LIMIT_MINUTES;

      if (withinTimeLimit) {
        return {
          success: true,
          type: 'auto',
          submission,
          confidence: 90,
          reason: `동명이인 중 학번 끝자리(${suffix}) 일치 + 시간 차이 ${timeDiff}분`,
          timeDifferenceMinutes: timeDiff,
        };
      } else {
        return {
          success: false,
          type: 'manual_required',
          submission,
          confidence: 70,
          reason: `동명이인 중 학번 일치하나 시간 차이 ${timeDiff}분 (${AUTO_MATCH_TIME_LIMIT_MINUTES}분 초과)`,
          timeDifferenceMinutes: timeDiff,
          candidates: [submission],
        };
      }
    }
  }

  // 숫자로 구분 불가 → 수동 처리
  return {
    success: false,
    type: 'manual_required',
    confidence: 30,
    reason: `동명이인 ${nameMatches.length}명 발견, 수동 매칭 필요`,
    candidates: nameMatches,
  };
}

/**
 * 매칭 결과에 따른 상태 배지 색상을 반환합니다.
 */
export function getMatchConfidenceBadgeVariant(
  confidence: number
): 'success' | 'warning' | 'error' {
  if (confidence >= 80) return 'success';
  if (confidence >= 50) return 'warning';
  return 'error';
}
