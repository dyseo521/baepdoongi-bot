# API 연동 가이드

뱁둥이 봇과 연동하기 위한 외부 서비스 설정 가이드입니다.

## 목차

- [Google Forms 연동](./google-forms.md) - 지원서 자동 접수
- [Slack Bot 설정](./slack-bot.md) - Slack App 설정 및 권한
- [Tasker 입금 알림](./tasker-deposit.md) - 안드로이드 입금 알림 자동화

## 연동 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Google Forms   │ -> │   Dashboard     │ -> │    DynamoDB     │
└─────────────────┘    │   (Next.js)     │    └─────────────────┘
                       └────────┬────────┘
                                │
┌─────────────────┐             │             ┌─────────────────┐
│  Tasker (폰)    │ ------------┘             │   Slack Bot     │
└─────────────────┘                           └─────────────────┘
```

## 환경 변수

모든 연동에 필요한 환경 변수:

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# 웹훅 시크릿
PAYMENT_WEBHOOK_SECRET=your-secret-key

# AWS (DynamoDB)
AWS_REGION=ap-northeast-2
DYNAMODB_TABLE_NAME=baepdoongi-table
```
