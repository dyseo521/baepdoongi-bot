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

# Dashboard deployment (after build)
aws s3 sync packages/dashboard/out/ s3://baepdoongi-dashboard-<account>-<region> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
packages/
├── bot/        # Slack Bot + Dashboard API (Lambda)
├── dashboard/  # Admin Dashboard - Next.js 15 (Static SPA)
├── shared/     # Shared TypeScript types
infra/          # AWS CDK infrastructure
```

### Package Dependencies

- `@baepdoongi/bot` imports types from `@baepdoongi/shared`
- `@baepdoongi/dashboard` imports types from `@baepdoongi/shared`
- Always build `shared` first when types change: `pnpm --filter @baepdoongi/shared build`

### Dashboard Architecture (정적 SPA)

대시보드는 Next.js 정적 빌드(`output: 'export')로 S3 + CloudFront에서 호스팅됩니다.

- **API**: Lambda (Bot 패키지의 `handlers/api/`)에서 제공
- **인증**: 클라이언트 사이드 (localStorage + API 검증)
- **라우팅**: CloudFront Function이 `/dashboard` → `/dashboard.html`로 리라이트

```
Bot Lambda (API Gateway)
├── /slack/events        # Slack 이벤트 핸들러
├── /api/*               # Dashboard API (인증, 회원, 이벤트 등)
└── /api/webhooks/*      # 외부 웹훅 (토스뱅크 입금, 지원서)

Dashboard (S3 + CloudFront)
├── 정적 HTML/JS/CSS
└── API 호출 → Lambda
```

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
// packages/bot/src/services/db.service.ts에서
import { saveActivityLog } from './services/db.service.js';

await saveActivityLog({
  type: 'EVENT_CREATE',
  userId: 'dashboard',
  eventId: event.eventId,
  details: { title: event.title },
});
```

**로그 타입 추가 방법:**
1. `packages/shared/src/types/log.ts`에서 `LogType` 유니온 타입에 추가
2. `LOG_TYPE_LABELS` 객체에 한글 라벨 추가
3. `pnpm --filter @baepdoongi/shared build` 실행

### 이름 형식 검증

회원 이름 형식: `이름/학과/학번(2자리)` (슬래시 주변 공백 허용)

```typescript
// 유효한 예시
"홍길동/컴퓨터공학과/24"
"홍길동 / 컴퓨터공학과 / 24"
```

### Slack Bot Handler Pattern

```
packages/bot/src/handlers/
├── events/     # team_join, user_change, app_mention
├── commands/   # Slash commands (/가이드, /익명건의)
├── actions/    # Button clicks, modal submissions
├── api/        # Dashboard API handlers
└── webhooks/   # 외부 웹훅 (결제, 지원서)
```

Register handlers in respective `index.ts` files.

### Dashboard API Pattern

API 핸들러는 `packages/bot/src/handlers/api/`에 위치:

```typescript
// 예: members.handler.ts
export async function handleGetMembers(event: APIGatewayProxyEvent) {
  // 인증 검증
  // DynamoDB 조회
  // 응답 반환
}
```

API Gateway 라우팅은 `infra/lib/stacks/bot-stack.ts`에서 정의.

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
- 조건부 spread 사용: `...(value && { key: value })`
- 환경변수 접근: `process.env['SLACK_BOT_TOKEN']` 형태로

## Key Technologies

- **Bot**: Slack Bolt 4.x, AWS Lambda (AwsLambdaReceiver), DynamoDB
- **Dashboard**: Next.js 15 (Static Export), React 19, TanStack Query, TailwindCSS
- **Infra**: AWS CDK (Lambda, API Gateway, DynamoDB, Secrets Manager, CloudFront, S3)
- **Testing**: Vitest

## 추가 기능 구현 체크리스트

새 기능 추가 시:
- [ ] 관련 타입 정의 (`packages/shared/src/types/`)
- [ ] API 핸들러 구현 (`packages/bot/src/handlers/api/`)
- [ ] **활동 로그 기록 추가** (saveActivityLog 호출)
- [ ] UI 컴포넌트 구현 (`packages/dashboard/src/components/`)
- [ ] `lib/api.ts`에 클라이언트 함수 추가
- [ ] 봇 핸들러 추가 시 `index.ts`에 등록
- [ ] API Gateway 라우트 추가 시 `bot-stack.ts`에 등록

## 주의사항

1. **이벤트 삭제 시**: Slack 공지 메시지도 함께 삭제됨
2. **이벤트 수정 시**: Slack 공지 메시지도 자동 업데이트됨 (응답 현황 유지)
3. **회원 동기화**: Slack API에서 가져온 모든 회원 정보를 DynamoDB에 저장
4. **Dashboard 배포**: 빌드 후 S3 sync + CloudFront invalidation 필요
