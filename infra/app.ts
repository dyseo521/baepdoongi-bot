#!/usr/bin/env tsx
/**
 * CDK 앱 엔트리포인트
 *
 * 모든 스택을 정의하고 배포 순서를 관리합니다.
 */

import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from './lib/stacks/database-stack.js';
import { SecretsStack } from './lib/stacks/secrets-stack.js';
import { BotStack } from './lib/stacks/bot-stack.js';
import { BedrockStack } from './lib/stacks/bedrock-stack.js';
import { DashboardStack } from './lib/stacks/dashboard-stack.js';
import { SchedulerStack } from './lib/stacks/scheduler-stack.js';
import { CiCdStack } from './lib/stacks/cicd-stack.js';

const app = new cdk.App();

// 환경 설정
const env: cdk.Environment = {
  account: process.env['CDK_DEFAULT_ACCOUNT'],
  region: process.env['CDK_DEFAULT_REGION'] || 'ap-northeast-2',
};

// 프로젝트 태그
const tags = {
  Project: 'baepdoongi-bot',
  Environment: process.env['ENVIRONMENT'] || 'dev',
  ManagedBy: 'cdk',
};

// 1. 시크릿 스택 (Slack 토큰, 웹훅 시크릿, 관리자 비밀번호)
const secretsStack = new SecretsStack(app, 'BaepdoongiSecretsStack', {
  env,
  tags,
  description: 'Slack 토큰 및 시크릿 관리',
});

// 2. 데이터베이스 스택 (DynamoDB)
const databaseStack = new DatabaseStack(app, 'BaepdoongiDatabaseStack', {
  env,
  tags,
  description: 'DynamoDB 테이블 (Single Table Design)',
});

// 3. Bedrock 스택 (Knowledge Base, S3)
const bedrockStack = new BedrockStack(app, 'BaepdoongiBedrockStack', {
  env,
  tags,
  description: 'Bedrock Knowledge Base 및 S3 버킷',
});

// 4. 대시보드 스택 (S3 + CloudFront 정적 호스팅)
// 봇 스택보다 먼저 생성하여 CloudFront 도메인을 CORS에 사용
// CloudFront에서 /api/* 프록시 설정 (same-origin 쿠키 지원)
// 환경변수 또는 기본값 사용 (API Gateway URL은 배포 후 고정됨)
const apiGatewayUrl =
  process.env['API_GATEWAY_URL'] ||
  'https://v2zb74shbf.execute-api.ap-northeast-2.amazonaws.com/prod/';
const dashboardStack = new DashboardStack(app, 'BaepdoongiDashboardStack', {
  env,
  tags,
  description: '관리자 대시보드 정적 호스팅 (CloudFront)',
  apiUrl: apiGatewayUrl,
});

// 5. 봇 스택 (Lambda, API Gateway, SQS)
// Dashboard API + Slack 이벤트 + 웹훅 통합 처리
const botStack = new BotStack(app, 'BaepdoongiBotStack', {
  env,
  tags,
  description: 'Slack Bot + Dashboard API + 웹훅 통합 Lambda',
  table: databaseStack.table,
  slackSecret: secretsStack.slackSecret,
  knowledgeBucket: bedrockStack.knowledgeBucket,
  dashboardDomain: dashboardStack.dashboardDomain,
});

// 6. 스케줄러 스택 (EventBridge)
const schedulerStack = new SchedulerStack(app, 'BaepdoongiSchedulerStack', {
  env,
  tags,
  description: 'EventBridge 스케줄러 (이름 검사 등)',
  nameCheckerLambda: botStack.nameCheckerLambda,
});

// 7. CI/CD 스택 (GitHub Actions OIDC)
new CiCdStack(app, 'BaepdoongiCiCdStack', {
  env,
  tags,
  description: 'GitHub Actions OIDC 인증 및 배포 권한',
  githubRepo: 'dyseo521/baepdoongi-bot',
  dashboardBucketName: dashboardStack.dashboardBucket.bucketName,
  cloudFrontDistributionId: dashboardStack.distribution.distributionId,
});

// 스택 의존성 설정
botStack.addDependency(secretsStack);
botStack.addDependency(databaseStack);
botStack.addDependency(bedrockStack);
botStack.addDependency(dashboardStack); // CORS 설정을 위해 대시보드 스택 먼저
schedulerStack.addDependency(botStack);

app.synth();
