# 뱁둥이 봇 (Baepdoongi Bot)

IGRUS 동아리 운영 자동화를 위한 Slack 봇 및 관리자 대시보드

## 아키텍처

![Architecture](./generated-diagrams/baepdoongi-architecture.png)

## 기술 스택

- **백엔드**: Node.js 22+, TypeScript, Slack Bolt
- **프론트엔드**: Next.js, TailwindCSS
- **인프라**: AWS CDK, Lambda, DynamoDB
- **AI**: Amazon Bedrock (Claude)

## 주요 기능

### Slack Bot
- 신규 회원 온보딩 DM 발송
- 이름 형식 검사 및 경고 (`이름/학과/학번`)
- RAG 기반 Q&A (@뱁둥이 멘션)
- `/가이드`, `/익명건의` 슬래시 커맨드

### 관리자 대시보드
- 회원/이벤트/건의사항 관리
- **회비 관리**: 지원서 제출 내역 조회, 수동 매칭
