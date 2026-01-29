/**
 * 이벤트 더미 데이터
 */

import type { Event, RSVPWithMember, RSVPListResponse } from '@baepdoongi/shared';

export const events: Event[] = [
  // 공지됨 이벤트 (참석 응답 포함)
  {
    eventId: 'evt-001',
    title: '2026년 1월 정기 모임',
    description: '새해 첫 정기 모임입니다. 동아리 운영 방향과 상반기 계획을 논의합니다.',
    datetime: '2026-02-01T19:00:00+09:00',
    startDate: '2026-02-01',
    startTime: '19:00',
    hasTime: true,
    location: '인하대 5호관 B101',
    type: 'meeting',
    status: 'published',
    createdBy: 'U001',
    createdAt: '2026-01-15T10:00:00Z',
    announcement: {
      channelId: 'C001',
      channelName: 'general',
      messageTs: '1737442800.123456',
      responseOptions: [
        { optionId: 'attend', label: '참석', emoji: ':white_check_mark:', order: 1 },
        { optionId: 'absent', label: '불참', emoji: ':x:', order: 2, requiresInput: true, inputLabel: '불참 사유' },
      ],
      announcedAt: '2026-01-20T10:00:00Z',
      announcedBy: 'U001',
    },
  },
  // 공지됨 이벤트 (세미나)
  {
    eventId: 'evt-002',
    title: 'AWS 서버리스 아키텍처 세미나',
    description: 'Lambda, API Gateway, DynamoDB를 활용한 서버리스 아키텍처 설계 방법을 알아봅니다.',
    datetime: '2026-02-08T14:00:00+09:00',
    startDate: '2026-02-08',
    startTime: '14:00',
    endTime: '17:00',
    hasTime: true,
    location: '인하대 60주년기념관 301호',
    type: 'seminar',
    status: 'published',
    createdBy: 'U002',
    createdAt: '2026-01-18T14:00:00Z',
    maxAttendees: 30,
    announcement: {
      channelId: 'C002',
      channelName: 'seminars',
      messageTs: '1737615600.654321',
      responseOptions: [
        { optionId: 'attend', label: '참석', emoji: ':raised_hands:', order: 1 },
        { optionId: 'online', label: '온라인 참석', emoji: ':computer:', order: 2 },
        { optionId: 'absent', label: '불참', emoji: ':x:', order: 3 },
      ],
      announcedAt: '2026-01-22T09:00:00Z',
      announcedBy: 'U002',
      allowMultipleSelection: false,
    },
  },
  // 공지 대기 이벤트
  {
    eventId: 'evt-003',
    title: 'React 스터디 OT',
    description: '이번 학기 React 스터디 오리엔테이션입니다. 커리큘럼과 진행 방식을 안내합니다.',
    datetime: '2026-02-10T18:00:00+09:00',
    startDate: '2026-02-10',
    startTime: '18:00',
    hasTime: true,
    location: '인하대 5호관 B102',
    type: 'workshop',
    status: 'draft',
    createdBy: 'U001',
    createdAt: '2026-01-25T11:00:00Z',
  },
  // 여러 날짜 이벤트
  {
    eventId: 'evt-004',
    title: 'IGRUS 해커톤 2026',
    description: '24시간 동안 진행되는 해커톤입니다. 팀을 구성하여 프로젝트를 완성하세요!',
    datetime: '2026-02-15T10:00:00+09:00',
    startDate: '2026-02-15',
    endDate: '2026-02-16',
    startTime: '10:00',
    endTime: '18:00',
    hasTime: true,
    isMultiDay: true,
    location: '인하대 5호관 전체',
    type: 'workshop',
    status: 'draft',
    createdBy: 'U001',
    createdAt: '2026-01-26T15:00:00Z',
    maxAttendees: 50,
    rsvpDeadline: '2026-02-10T23:59:59+09:00',
  },
  // 완료된 이벤트
  {
    eventId: 'evt-005',
    title: '신입생 환영회',
    description: '25학번 신입생을 환영하는 자리입니다.',
    datetime: '2026-01-10T18:00:00+09:00',
    startDate: '2026-01-10',
    startTime: '18:00',
    hasTime: true,
    location: '인하대 학생회관 소극장',
    type: 'social',
    status: 'completed',
    createdBy: 'U001',
    createdAt: '2025-12-20T10:00:00Z',
    announcement: {
      channelId: 'C001',
      channelName: 'general',
      messageTs: '1735516800.111111',
      responseOptions: [
        { optionId: 'attend', label: '참석', emoji: ':tada:', order: 1 },
        { optionId: 'absent', label: '불참', emoji: ':cry:', order: 2 },
      ],
      announcedAt: '2025-12-25T10:00:00Z',
      announcedBy: 'U001',
    },
  },
  // 취소된 이벤트
  {
    eventId: 'evt-006',
    title: '외부 강연 (취소됨)',
    description: '외부 연사 일정 문제로 취소되었습니다.',
    datetime: '2026-01-20T14:00:00+09:00',
    startDate: '2026-01-20',
    startTime: '14:00',
    hasTime: true,
    location: 'TBD',
    type: 'seminar',
    status: 'cancelled',
    createdBy: 'U002',
    createdAt: '2026-01-05T10:00:00Z',
  },
  // 시간 없는 이벤트
  {
    eventId: 'evt-007',
    title: '프로젝트 제출 마감',
    description: '동아리 프로젝트 최종 제출 마감일입니다.',
    datetime: '2026-03-01T00:00:00+09:00',
    startDate: '2026-03-01',
    hasTime: false,
    type: 'other',
    status: 'draft',
    createdBy: 'U001',
    createdAt: '2026-01-28T09:00:00Z',
  },
];

// RSVP 더미 데이터
export const rsvpsByEvent: Record<string, RSVPWithMember[]> = {
  'evt-001': [
    {
      eventId: 'evt-001',
      memberId: 'U001',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-20T11:00:00Z',
      memberName: '홍길동/컴퓨터공학과/24',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hong',
    },
    {
      eventId: 'evt-001',
      memberId: 'U002',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-20T11:30:00Z',
      memberName: '김철수/정보통신공학과/23',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kim',
    },
    {
      eventId: 'evt-001',
      memberId: 'U003',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-20T12:00:00Z',
      memberName: '이영희/전자공학과/25',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lee',
    },
    {
      eventId: 'evt-001',
      memberId: 'U004',
      status: 'absent',
      responseOptionId: 'absent',
      inputValue: '개인 사정으로 참석이 어렵습니다.',
      respondedAt: '2026-01-21T09:00:00Z',
      memberName: '박지민/소프트웨어학과/24',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=park',
    },
    {
      eventId: 'evt-001',
      memberId: 'U005',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-21T10:00:00Z',
      memberName: '정수현/컴퓨터공학과/23',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jung',
    },
  ],
  'evt-002': [
    {
      eventId: 'evt-002',
      memberId: 'U001',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-22T10:00:00Z',
      memberName: '홍길동/컴퓨터공학과/24',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hong',
    },
    {
      eventId: 'evt-002',
      memberId: 'U006',
      status: 'attending',
      responseOptionId: 'online',
      respondedAt: '2026-01-22T11:00:00Z',
      memberName: '최민준/데이터사이언스학과/25',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=choi',
    },
    {
      eventId: 'evt-002',
      memberId: 'U007',
      status: 'attending',
      responseOptionId: 'attend',
      respondedAt: '2026-01-22T14:00:00Z',
      memberName: '강서연/정보통신공학과/24',
      memberImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kang',
    },
  ],
};

export function getEventRSVPs(eventId: string): RSVPListResponse {
  const rsvps = rsvpsByEvent[eventId] || [];
  const summary: Record<string, number> = {};

  for (const rsvp of rsvps) {
    const optionId = rsvp.responseOptionId || 'unknown';
    summary[optionId] = (summary[optionId] || 0) + 1;
  }

  return { rsvps, summary };
}
