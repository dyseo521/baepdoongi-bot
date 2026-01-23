/**
 * ID 생성 유틸리티
 *
 * 각 엔티티에 대한 고유 ID를 생성합니다.
 */

import { randomBytes } from 'crypto';

/**
 * 접두사와 함께 고유 ID를 생성합니다.
 *
 * @param prefix - ID 접두사 (예: 'event', 'log', 'session')
 * @param length - 랜덤 부분의 길이 (기본값: 12)
 * @returns 생성된 ID (예: 'event_a1b2c3d4e5f6')
 */
export function generateId(prefix: string, length: number = 12): string {
  const randomPart = randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

  return `${prefix}_${randomPart}`;
}

/**
 * 타임스탬프 기반 ID를 생성합니다.
 * 시간 순 정렬이 필요한 경우에 사용합니다.
 *
 * @param prefix - ID 접두사
 * @returns 생성된 ID (예: 'log_1705123456789_a1b2c3')
 */
export function generateTimestampId(prefix: string): string {
  const timestamp = Date.now();
  const randomPart = randomBytes(3).toString('hex');

  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * 날짜 기반 ID를 생성합니다.
 * 일별 집계가 필요한 경우에 사용합니다.
 *
 * @param prefix - ID 접두사
 * @param date - 날짜 (기본값: 현재)
 * @returns 생성된 ID (예: 'report_2024-01-13_a1b2c3')
 */
export function generateDateId(prefix: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const randomPart = randomBytes(3).toString('hex');

  return `${prefix}_${dateStr}_${randomPart}`;
}

/**
 * UUID v4 형식의 ID를 생성합니다.
 */
export function generateUUID(): string {
  const bytes = randomBytes(16);

  // UUID v4 형식으로 변환
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 1

  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
