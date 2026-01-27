# 뱁둥이 봇 (Baepdoongi Bot)

IGRUS 동아리 운영 자동화를 위한 Slack 봇 및 관리자 대시보드

## 아키텍처

![Architecture](./generated-diagrams/baepdoongi-architecture.png)

### RAG 파이프라인

```
사용자 질문 (@뱁둥이)
    ↓
app_mention 이벤트 → "생각 중..." 즉시 응답
    ↓
SQS 큐 (baepdoongi-rag-queue)
    ↓
RAG Lambda → Bedrock RetrieveAndGenerate
    ↓
Slack 메시지 업데이트
```

| 항목 | 값 |
|------|-----|
| Knowledge Base ID | `XMRRFE6B29` |
| 임베딩 모델 | Titan Embeddings G2 v2.0 (1024차원) |
| 응답 모델 | Claude Haiku 4.5 (Global CRIS) |
| 벡터 저장소 | S3 Vectors |

## 기술 스택

- **백엔드**: Node.js 22+, TypeScript, Slack Bolt, AWS Lambda
- **프론트엔드**: Next.js 15 (Static Export), React 19, TailwindCSS, TanStack Query
- **인프라**: AWS CDK, API Gateway, DynamoDB, S3, CloudFront, SQS, Secrets Manager, SES
- **AI/RAG**: Amazon Bedrock (Knowledge Base, Claude Haiku 4.5, Titan Embeddings)

## 주요 기능

### Slack Bot

#### 슬래시 커맨드
- `/가이드` - 동아리 활동 안내 (Ephemeral 메시지)
- `/익명건의` - 건의사항 제출 모달 (카테고리, 제목, 내용)

#### 이벤트 핸들러
- **신규 회원 온보딩**: `team_join` 이벤트 시 웰컴 DM 자동 발송
- **이름 형식 검사**: `user_change` 이벤트 시 `이름/학과/학번` 형식 검증 및 경고 DM
- **정기 이름 체크**: EventBridge 스케줄러로 매일 오전 9시 전체 회원 검사

#### 이벤트 응답 시스템
- **동적 응답 옵션**: 이벤트별 커스텀 버튼 (참석/불참 외 다양한 옵션)
- **중복 선택**: 여러 옵션 동시 선택 지원
- **텍스트 입력**: 자유 텍스트 응답 옵션 (모달)
- **응답 현황**: 실시간 응답 집계 및 표시

#### RAG 기반 Q&A
- `@뱁둥이` 멘션으로 질문
- SQS 비동기 처리로 Slack 3초 타임아웃 우회
- Knowledge Base 기반 동아리 정보 응답

### 관리자 대시보드

#### 대시보드 홈
- 통계 카드 (회원 수, 이벤트 수, 건의사항 수)
- 응답률 트렌드 차트
- 최근 활동 로그

#### 회원 관리
- 회원 목록 조회 및 검색
- Slack 워크스페이스 동기화
- 이름 형식 검증 상태 표시
- 개별/일괄 경고 DM 발송

#### 이벤트 관리
- 이벤트 CRUD
- Slack 채널 공지 자동 발송/수정/삭제
- 응답 옵션 설정:
  - 커스텀 버튼 (이모지, 라벨)
  - 중복 선택 허용 여부
  - 텍스트 입력 옵션
- 응답 현황 모달:
  - 옵션별 응답자 목록
  - 응답자 대상 일괄 DM 발송
- DM 발송 이력 관리

#### 건의사항
- 익명 건의 목록 조회
- 상태 관리 (대기 → 검토 중 → 완료)
- 답장 DM 발송

#### 활동 로그
- 33가지 로그 타입 기록
- 카테고리별 필터링 (회원, 이벤트, 건의, 시스템, 회비)
- 상세 정보 조회

#### 회비 관리
- **지원서 관리**:
  - Google Forms 웹훅 연동
  - 지원서 목록 조회 및 상태 관리
- **입금 기록**:
  - Tasker + 토스뱅크 웹훅 자동 수집
  - 입금자명, 금액, 날짜 기록
- **자동/수동 매칭**:
  - 이름 기반 자동 매칭
  - 수동 매칭 인터페이스
- **초대 발송**:
  - SES를 통한 Slack 초대 이메일 발송
  - 발송 상태 추적

### 외부 웹훅

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/webhooks/payments` | Tasker 입금 알림 (토스뱅크) |
| `POST /api/webhooks/submissions` | Google Forms 지원서 |

## 프로젝트 구조

```
packages/
  bot/                    # Slack Bot + Dashboard API (Lambda)
    src/
      handlers/
        events/           # team_join, user_change, app_mention
        commands/         # /가이드, /익명건의
        actions/          # 버튼 클릭, 모달 제출
        api/              # Dashboard API 핸들러
        webhooks/         # 외부 웹훅 (결제, 지원서)
      services/           # DB, Slack, RAG 서비스
  dashboard/              # 관리자 대시보드 (Static SPA)
    src/
      app/                # Next.js App Router 페이지
      components/         # React 컴포넌트
      lib/                # API 클라이언트, 유틸리티
  shared/                 # 공유 TypeScript 타입
infra/                    # AWS CDK 인프라
docs/
  knowledge-base/         # RAG Knowledge Base 문서
```

## 데이터 모델 (DynamoDB Single Table)

| 엔티티 | PK | SK | 설명 |
|--------|----|----|------|
| Member | `MEMBER#{slackId}` | `DETAIL` | 회원 정보 |
| Event | `EVENT#{eventId}` | `DETAIL` | 이벤트 정보 |
| RSVP | `EVENT#{eventId}` | `RSVP#{userId}` | 이벤트 응답 |
| Suggestion | `SUGGESTION#{id}` | `DETAIL` | 건의사항 |
| Submission | `SUB#{id}` | `DETAIL` | 지원서 |
| Deposit | `DEP#{id}` | `DETAIL` | 입금 기록 |
| Log | `LOG` | `LOG#{createdAt}#{logId}` | 활동 로그 |
| RagSession | `RAG_SESSION#{sessionId}` | `DETAIL` | RAG 대화 세션 |

**GSI 패턴**:
- `GSI1`: 엔티티 타입 + 타임스탬프 조회
- `GSI2`: 상태 또는 로그 타입별 조회

## 개발 환경

```bash
# 의존성 설치
pnpm install

# 개발 서버
pnpm dev:bot         # Bot (Socket Mode)
pnpm dev:dashboard   # Dashboard (localhost:3001)

# 빌드
pnpm build

# 테스트 및 품질
pnpm test            # Vitest
pnpm lint            # ESLint
pnpm typecheck       # TypeScript

# 배포 (자동: main push 시 GitHub Actions)
pnpm cdk:deploy      # 수동 CDK 배포
```

## 환경 변수

Secrets Manager에서 관리:
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`
- `DASHBOARD_PASSWORD`
- `GOOGLE_SHEETS_CREDENTIALS`, `GOOGLE_SHEETS_ID`
- `TOSS_WEBHOOK_SECRET`

## Knowledge Base

### 문서 목록

| 파일 | 내용 |
|------|------|
| `01-동아리-소개.md` | IGRUS 소개, 운영진, 연락처 |
| `02-회비-안내.md` | 회비 금액, 계좌 정보 |
| `03-활동-안내.md` | 스터디, 프로젝트, 행사 |
| `04-슬랙-가이드.md` | 프로필 규칙, 채널, 봇 사용법 |
| `05-FAQ.md` | 자주 묻는 질문 |
| `06-인하대-맛집.md` | 인하대 주변 맛집 |
| `07-캠퍼스-시설.md` | 캠퍼스 시설 가이드 |
| `08-학사-꿀팁.md` | 학사제도 꿀팁 |

### 문서 동기화

```bash
# S3 업로드
npx tsx scripts/setup-knowledge-base.ts

# AWS Console에서 Knowledge Base Sync 실행
# https://console.aws.amazon.com/bedrock/home?region=ap-northeast-2#/knowledge-bases/XMRRFE6B29
```
