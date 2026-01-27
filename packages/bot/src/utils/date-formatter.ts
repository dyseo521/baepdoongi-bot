/**
 * 날짜/시간 포맷팅 유틸리티
 */

/** 이벤트 날짜/시간 표시 포맷 옵션 */
export interface EventDateTimeOptions {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isMultiDay?: boolean;
  hasTime?: boolean;
  datetime?: string;
}

/**
 * 이벤트 날짜/시간을 한국어 형식으로 포맷합니다.
 *
 * 표시 예시:
 * - 하루, 시간 미지정: "2025년 1월 27일 월"
 * - 하루, 시간 지정: "2025년 1월 27일 월 14:00"
 * - 하루, 시간 범위: "2025년 1월 27일 월 14:00~16:00"
 * - 기간, 시간 미지정: "2025년 1월 27일 월 ~ 1월 29일 수"
 * - 기간, 시간 지정: "2025년 1월 27일 월 14:00 ~ 1월 29일 수 16:00"
 */
export function formatEventDateTimeForDisplay(options: EventDateTimeOptions): string {
  const { startDate, endDate, startTime, endTime, isMultiDay, hasTime, datetime } = options;

  // 새 필드가 없으면 기존 datetime 사용 (하위 호환성)
  if (!startDate) {
    if (!datetime) return '미정';
    const date = new Date(datetime);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  // 시작 날짜 파싱
  const startDateObj = new Date(startDate + 'T00:00:00');
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth() + 1;
  const startDay = startDateObj.getDate();
  const startWeekday = weekdays[startDateObj.getDay()];

  // 시작 날짜 문자열 생성
  let result = `${startYear}년 ${startMonth}월 ${startDay}일 ${startWeekday}`;

  // 시간이 있으면 시작 시간 추가
  if (hasTime && startTime) {
    result += ` ${startTime}`;
  }

  // 기간(여러 날)인 경우
  if (isMultiDay && endDate) {
    const endDateObj = new Date(endDate + 'T00:00:00');
    const endYear = endDateObj.getFullYear();
    const endMonth = endDateObj.getMonth() + 1;
    const endDay = endDateObj.getDate();
    const endWeekday = weekdays[endDateObj.getDay()];

    // 같은 연도면 연도 생략
    if (startYear === endYear) {
      result += ` ~ ${endMonth}월 ${endDay}일 ${endWeekday}`;
    } else {
      result += ` ~ ${endYear}년 ${endMonth}월 ${endDay}일 ${endWeekday}`;
    }

    // 종료 시간 추가
    if (hasTime && endTime) {
      result += ` ${endTime}`;
    }
  } else if (hasTime && endTime && startTime !== endTime) {
    // 하루지만 시간 범위가 있는 경우
    result += `~${endTime}`;
  }

  return result;
}
