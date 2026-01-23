# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

뱁둥이 봇 (Baepdoongi Bot) - IGRUS 동아리 운영 자동화를 위한 Slack 봇 및 관리자 대시보드

## Commands

```bash
# Development
pnpm dev:bot         # Bot local server (Socket Mode)
pnpm dev:dashboard   # Dashboard on localhost:3001

# Build
pnpm build           # Build all packages

# Testing & Quality
pnpm test            # Run tests (vitest)
pnpm lint            # Lint all packages
pnpm lint:fix        # Fix lint issues
pnpm typecheck       # TypeScript type checking

# Deployment
pnpm cdk:deploy      # Deploy AWS CDK stacks
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
packages/
├── bot/        # Slack Bot - Node.js + Slack Bolt + AWS Lambda
├── dashboard/  # Admin Dashboard - Next.js 15 (App Router)
├── shared/     # Shared TypeScript types
infra/          # AWS CDK infrastructure
```

### Package Dependencies

- `@baepdoongi/bot` imports types from `@baepdoongi/shared`
- `@baepdoongi/dashboard` imports types from `@baepdoongi/shared`
- Always build `shared` first when types change: types are compiled to `packages/shared/dist/`

### DynamoDB Single Table Design

All entities in one table:

| Entity | PK | SK |
|--------|----|----|
| Member | `MEMBER#{slackId}` | `DETAIL` |
| Event | `EVENT#{eventId}` | `DETAIL` |
| RSVP | `EVENT#{eventId}` | `RSVP#{userId}` |
| Suggestion | `SUGGESTION#{id}` | `DETAIL` |
| Submission | `SUB#{id}` | `DETAIL` |
| Deposit | `DEP#{id}` | `DETAIL` |
| Log | `LOG` | `LOG#{createdAt}#{logId}` |

GSI patterns:
- `GSI1`: Query by entity type + timestamp (`GSI1PK`, `GSI1SK`)
- `GSI2`: Query by status or log type (`GSI2PK`, `GSI2SK`)

## 핵심 개발 규칙

### 활동 로그 기록 (중요!)

**새 기능을 추가할 때 반드시 활동 로그를 기록해야 합니다.**

```typescript
// packages/dashboard/src/lib/db.ts 에서 import
import { saveActivityLog } from '@/lib/db';

// 예시: 이벤트 생성 시
await saveActivityLog({
  type: 'EVENT_CREATE',
  userId: 'dashboard',  // 또는 Slack userId
  eventId: event.eventId,  // 관련 이벤트 ID (optional)
  targetUserId: 'U123456',  // DM 대상자 (optional)
  details: {
    title: event.title,
    datetime: event.datetime,
    // 기타 관련 정보
  },
});
```

**로그 타입 추가 방법:**
1. `packages/shared/src/types/log.ts`에서 `LogType` 유니온 타입에 새 타입 추가
2. `LOG_TYPE_LABELS` 객체에 한글 라벨 추가
3. `pnpm --filter @baepdoongi/shared build` 실행
4. `packages/dashboard/src/app/logs/page.tsx`에서:
   - `LOG_TYPE_LABELS` 객체에 한글 라벨 추가
   - `LOG_TYPE_CONFIG` 객체에 아이콘/색상 설정
   - `LOG_CATEGORIES` 배열에서 적절한 카테고리에 포함

**현재 지원되는 로그 타입:**
- 회원: `MEMBER_JOIN`, `MEMBER_LEAVE`, `MEMBER_SYNC`, `NAME_WARNING_SENT` 등
- 이벤트: `EVENT_CREATE`, `EVENT_UPDATE`, `EVENT_DELETE`, `EVENT_ANNOUNCE`, `EVENT_RSVP` 등
- DM: `DM_SENT`, `DM_WELCOME`, `DM_ERROR`
- 건의사항: `SUGGESTION_SUBMIT`, `SUGGESTION_READ`, `SUGGESTION_REPLY`
- RAG: `RAG_QUERY`, `RAG_RESPONSE`, `RAG_ERROR`
- 시스템: `SYSTEM_START`, `SYSTEM_ERROR`, `API_ERROR`

### 이름 형식 검증

회원 이름 형식: `이름/학과/학번(2자리)` (슬래시 주변 공백 허용)

```typescript
// 유효한 예시
"홍길동/컴퓨터공학과/24"
"홍길동 / 컴퓨터공학과 / 24"
"김철수/SW융합학부/21"
```

관련 파일:
- `packages/bot/src/utils/name-validator.ts`
- `packages/dashboard/src/app/api/members/route.ts`
- `packages/dashboard/src/app/api/stats/route.ts`

### Slack Bot Handler Pattern

```
packages/bot/src/handlers/
├── events/     # team_join, user_change, app_mention
├── commands/   # Slash commands (/가이드, /익명건의)
├── actions/    # Button clicks, modal submissions
```

Register handlers in respective `index.ts` files. Action handlers support regex patterns:
```typescript
app.action(/^event_response_/, handleEventResponse);
```

### Dashboard API Routes

Next.js App Router pattern in `packages/dashboard/src/app/api/`:

```
api/
├── events/
│   ├── route.ts              # GET (목록), POST (생성)
│   └── [eventId]/
│       ├── route.ts          # GET, PUT, DELETE
│       └── announce/route.ts # POST (Slack 공지)
├── members/
│   ├── route.ts              # GET (목록), POST (동기화)
│   └── [memberId]/warn/route.ts  # POST (경고 DM)
├── logs/route.ts             # GET (활동 로그)
├── stats/route.ts            # GET (대시보드 통계)
└── slack/channels/route.ts   # GET (채널 목록)
```

- Cookie-based auth with middleware protection
- API client functions in `packages/dashboard/src/lib/api.ts`

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext (native ESM with `.js` extensions in imports)
- **Strict**: All strict flags enabled including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

When importing local modules in bot package, use `.js` extension:
```typescript
import { saveEvent } from './services/db.service.js';
```

**exactOptionalPropertyTypes 주의사항:**
- optional 프로퍼티에 `undefined` 직접 할당 금지
- 조건부 spread 사용 권장: `...(value && { key: value })`
- 환경변수 접근: `process.env['SLACK_BOT_TOKEN']` 형태로

## Key Technologies

- **Bot**: Slack Bolt 4.x, AWS Lambda (AwsLambdaReceiver), DynamoDB
- **Dashboard**: Next.js 15, React 19, TanStack Query, TailwindCSS
- **Infra**: AWS CDK (Lambda, API Gateway, DynamoDB, Secrets Manager, Bedrock)
- **Testing**: Vitest

## 추가 기능 구현 체크리스트

새 기능 추가 시:
- [ ] 관련 타입 정의 (`packages/shared/src/types/`)
- [ ] API 라우트 구현 (`packages/dashboard/src/app/api/`)
- [ ] **활동 로그 기록 추가** (saveActivityLog 호출)
- [ ] UI 컴포넌트 구현 (`packages/dashboard/src/components/`)
- [ ] `lib/api.ts`에 클라이언트 함수 추가
- [ ] 봇 핸들러 추가 시 `index.ts`에 등록

## 주의사항

1. **이벤트 삭제 시**: Slack 공지 메시지도 함께 삭제됨
2. **이벤트 수정 시**: Slack 공지 메시지도 자동 업데이트됨 (응답 현황 유지)
3. **회원 동기화**: Slack API에서 가져온 모든 회원 정보를 DynamoDB에 저장
4. **경고 DM**: 이름 형식 미준수 회원에게 개별/일괄 DM 전송 가능
