'use client';

import dynamic from 'next/dynamic';

// 경량 컴포넌트 - 정적 임포트
export { ResponseOptionsEditor, RESPONSE_TEMPLATES } from './response-options-editor';

// 무거운 모달 컴포넌트 - 동적 임포트 (초기 번들 크기 감소)
export const AnnounceModal = dynamic(
  () => import('./announce-modal').then((m) => m.AnnounceModal),
  { ssr: false }
);

export const CreateEventModal = dynamic(
  () => import('./create-event-modal').then((m) => m.CreateEventModal),
  { ssr: false }
);

export const EditEventModal = dynamic(
  () => import('./edit-event-modal').then((m) => m.EditEventModal),
  { ssr: false }
);

export const RSVPListModal = dynamic(
  () => import('./rsvp-list-modal').then((m) => m.RSVPListModal),
  { ssr: false }
);
