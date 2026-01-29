/**
 * 건의사항 더미 데이터
 */

import type { Suggestion } from '@baepdoongi/shared';

export const suggestions: Suggestion[] = [
  {
    suggestionId: 'sug-001',
    category: 'study',
    title: '스터디 주제 다양화 요청',
    content: '현재 웹 개발 위주의 스터디가 많은데, AI/ML 관련 스터디도 개설해주시면 좋겠습니다. 많은 회원들이 관심을 가지고 있습니다.',
    status: 'pending',
    createdAt: '2026-01-28T10:30:00Z',
  },
  {
    suggestionId: 'sug-002',
    category: 'event',
    title: '외부 연사 초청 건의',
    content: '현업 개발자분들의 강연을 들을 수 있는 기회가 있으면 좋겠습니다. 특히 스타트업이나 대기업에서 일하시는 분들의 경험담을 듣고 싶습니다.',
    status: 'in_review',
    createdAt: '2026-01-25T14:00:00Z',
    adminNote: '검토 중 - 2월 중 외부 연사 초청 예정',
  },
  {
    suggestionId: 'sug-003',
    category: 'facility',
    title: '동아리방 정리정돈',
    content: '동아리방이 조금 어수선한 것 같습니다. 정기적인 청소 일정을 정하면 어떨까요?',
    status: 'resolved',
    createdAt: '2026-01-20T09:00:00Z',
    processedAt: '2026-01-22T11:00:00Z',
    adminNote: '매주 금요일 청소 당번제 시행 예정',
  },
  {
    suggestionId: 'sug-004',
    category: 'budget',
    title: '세미나 다과비 지원',
    content: '세미나 시 간단한 다과를 제공하면 참여율이 높아질 것 같습니다. 예산 지원이 가능할까요?',
    status: 'resolved',
    createdAt: '2026-01-15T16:30:00Z',
    processedAt: '2026-01-18T10:00:00Z',
    adminNote: '세미나당 3만원 한도로 다과비 지원 승인',
  },
  {
    suggestionId: 'sug-005',
    category: 'general',
    title: '슬랙 채널 정리 제안',
    content: '슬랙 채널이 너무 많아서 정보를 찾기 어렵습니다. 사용하지 않는 채널을 아카이브하고 채널 가이드를 만들어주세요.',
    status: 'rejected',
    createdAt: '2026-01-10T11:00:00Z',
    processedAt: '2026-01-12T09:00:00Z',
    adminNote: '현재 채널 구조가 적절하다고 판단됩니다. 채널 가이드는 /가이드 명령어로 확인 가능합니다.',
  },
];
