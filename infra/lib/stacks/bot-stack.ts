/**
 * Slack Bot 스택
 *
 * Lambda 함수, API Gateway, SQS를 포함합니다.
 * - Slack 이벤트 수신
 * - Dashboard API 제공
 * - 외부 웹훅 처리 (Google Form, Tasker)
 * - SES 이메일 발송
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import type { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BotStackProps extends cdk.StackProps {
  /** DynamoDB 테이블 */
  table: dynamodb.ITable;
  /** Slack 시크릿 */
  slackSecret: secretsmanager.Secret;
  /** Knowledge Base S3 버킷 */
  knowledgeBucket: s3.Bucket;
  /** Dashboard CloudFront 도메인 (CORS용) */
  dashboardDomain?: string;
}

export class BotStack extends cdk.Stack {
  /** Slack 이벤트 처리 Lambda */
  public readonly botLambda: lambda.Function;
  /** RAG 처리 Lambda */
  public readonly ragLambda: lambda.Function;
  /** DM Worker Lambda */
  public readonly dmWorkerLambda: lambda.Function;
  /** 이름 검사 Lambda */
  public readonly nameCheckerLambda: lambda.Function;
  /** API Gateway */
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: BotStackProps) {
    super(scope, id, props);

    const { table, slackSecret, knowledgeBucket, dashboardDomain } = props;

    // SQS 큐: RAG 비동기 처리용 (Slack 3초 제한 대응)
    const ragQueue = new sqs.Queue(this, 'RagQueue', {
      queueName: 'baepdoongi-rag-queue',
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(1),
    });

    // SQS 큐: 단체 DM 발송용 (Rate Limiting 대응)
    const dmQueue = new sqs.Queue(this, 'DmQueue', {
      queueName: 'baepdoongi-dm-queue',
      visibilityTimeout: cdk.Duration.minutes(5), // 100명 발송 시 약 2분 소요
      retentionPeriod: cdk.Duration.days(1),
    });

    // 공통 Lambda 환경 변수
    const commonEnv = {
      DYNAMODB_TABLE_NAME: table.tableName,
      SLACK_SECRET_NAME: slackSecret.secretName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    // 메인 Bot Lambda (Slack 이벤트 + Dashboard API + 웹훅 통합 핸들러)
    this.botLambda = new lambda.Function(this, 'BotLambda', {
      functionName: 'baepdoongi-bot',
      description: 'Slack Bot + Dashboard API + 웹훅 통합 핸들러',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'app.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../../packages/bot/dist')
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ...commonEnv,
        RAG_QUEUE_URL: ragQueue.queueUrl,
        DM_QUEUE_URL: dmQueue.queueUrl,
        SES_FROM_EMAIL: 'weareigrus@gmail.com',
        SLACK_INVITE_LINK: 'https://join.slack.com/t/26-1igrus/shared_invite/zt-3oqsbieuc-KOwV0_s6X3M8SEZO6mkgGw',
        KAKAO_INVITE_LINK: 'https://invite.kakao.com/tc/INHTyYoc4H',
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // RAG Lambda (비동기 질문 처리)
    this.ragLambda = new lambda.Function(this, 'RagLambda', {
      functionName: 'baepdoongi-rag',
      description: 'Bedrock RAG 질문 처리',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'rag-handler.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../../packages/bot/dist')
      ),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...commonEnv,
        // Knowledge Base ID는 Secrets Manager에서 로드됨
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // 이름 검사 Lambda (스케줄러용)
    this.nameCheckerLambda = new lambda.Function(this, 'NameCheckerLambda', {
      functionName: 'baepdoongi-name-checker',
      description: '이름 형식 검사 및 경고 발송',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'name-checker.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../../packages/bot/dist')
      ),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: commonEnv,
      architecture: lambda.Architecture.ARM_64,
    });

    // DM Worker Lambda (단체 DM 발송)
    // Note: Rate limiting은 SQS batchSize: 1과 코드 내 딜레이로 처리됨
    this.dmWorkerLambda = new lambda.Function(this, 'DmWorkerLambda', {
      functionName: 'baepdoongi-dm-worker',
      description: '단체 DM 발송 처리',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'dm-worker.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../../packages/bot/dist')
      ),
      memorySize: 256,
      timeout: cdk.Duration.minutes(5), // 100명 발송 시 약 2분 소요
      environment: commonEnv,
      architecture: lambda.Architecture.ARM_64,
    });

    // SQS를 RAG Lambda의 이벤트 소스로 연결
    this.ragLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(ragQueue, {
        batchSize: 1,
      })
    );

    // SQS를 DM Worker Lambda의 이벤트 소스로 연결
    this.dmWorkerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(dmQueue, {
        batchSize: 1,
      })
    );

    // 권한 부여
    table.grantReadWriteData(this.botLambda);
    table.grantReadWriteData(this.ragLambda);
    table.grantReadWriteData(this.nameCheckerLambda);
    table.grantReadWriteData(this.dmWorkerLambda);

    // GSI 쿼리 권한 (Table.fromTableName은 GSI 권한을 자동 부여하지 않음)
    const gsiPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `${table.tableArn}/index/*`,
      ],
    });
    this.botLambda.addToRolePolicy(gsiPolicy);
    this.ragLambda.addToRolePolicy(gsiPolicy);
    this.nameCheckerLambda.addToRolePolicy(gsiPolicy);
    this.dmWorkerLambda.addToRolePolicy(gsiPolicy);

    slackSecret.grantRead(this.botLambda);
    slackSecret.grantRead(this.ragLambda);
    slackSecret.grantRead(this.nameCheckerLambda);
    slackSecret.grantRead(this.dmWorkerLambda);

    ragQueue.grantSendMessages(this.botLambda);
    ragQueue.grantConsumeMessages(this.ragLambda);

    dmQueue.grantSendMessages(this.botLambda);
    dmQueue.grantConsumeMessages(this.dmWorkerLambda);

    knowledgeBucket.grantRead(this.ragLambda);

    // Bedrock 권한 (Cross-Region Inference Profile 포함)
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:RetrieveAndGenerate',
        'bedrock:Retrieve',
        'bedrock:GetInferenceProfile',
        'bedrock:ListInferenceProfiles',
      ],
      resources: ['*'],
    });
    this.ragLambda.addToRolePolicy(bedrockPolicy);

    // S3 Vectors 권한 (RAG Lambda용)
    const s3VectorsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3vectors:QueryVectors',
        's3vectors:GetVectors',
      ],
      resources: [
        `arn:aws:s3vectors:${this.region}:${this.account}:bucket/baepdoongi-vectors-${this.account}-${this.region}`,
        `arn:aws:s3vectors:${this.region}:${this.account}:bucket/baepdoongi-vectors-${this.account}-${this.region}/index/*`,
      ],
    });
    this.ragLambda.addToRolePolicy(s3VectorsPolicy);

    // SES 권한 (초대 이메일 발송)
    const sesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
      ],
      resources: ['*'],
    });
    this.botLambda.addToRolePolicy(sesPolicy);

    // CORS 허용 도메인
    const corsAllowOrigins = dashboardDomain
      ? [dashboardDomain, 'http://localhost:3001']
      : ['*'];

    // API Gateway with CORS
    this.api = new apigateway.RestApi(this, 'BotApi', {
      restApiName: 'baepdoongi-api',
      description: 'Slack Bot + Dashboard API Gateway',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: corsAllowOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        allowCredentials: true,
      },
    });

    // Lambda 통합 (공통)
    const lambdaIntegration = new apigateway.LambdaIntegration(this.botLambda, {
      timeout: cdk.Duration.seconds(29),
    });

    // ============================================
    // Slack 엔드포인트 (고정)
    // ============================================
    const slack = this.api.root.addResource('slack');
    const slackEvents = slack.addResource('events');
    slackEvents.addMethod('POST', lambdaIntegration);

    // ============================================
    // API 프록시 (모든 /api/* 요청을 Lambda로 전달)
    // 개별 라우트 대신 프록시를 사용하여 Lambda 권한 정책 크기 제한 회피
    // ============================================
    const apiResource = this.api.root.addResource('api');
    const apiProxy = apiResource.addResource('{proxy+}');
    apiProxy.addMethod('ANY', lambdaIntegration);
    // /api 루트 경로도 처리
    apiResource.addMethod('ANY', lambdaIntegration);

    // ============================================
    // 출력
    // ============================================
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway 엔드포인트',
      exportName: 'BaepdoongiApiEndpoint',
    });

    new cdk.CfnOutput(this, 'SlackEventsUrl', {
      value: `${this.api.url}slack/events`,
      description: 'Slack Event Subscriptions URL',
      exportName: 'BaepdoongiSlackEventsUrl',
    });

    new cdk.CfnOutput(this, 'DashboardApiUrl', {
      value: `${this.api.url}api`,
      description: 'Dashboard API URL (NEXT_PUBLIC_API_URL)',
      exportName: 'BaepdoongiDashboardApiUrl',
    });

    new cdk.CfnOutput(this, 'SubmissionWebhookUrl', {
      value: `${this.api.url}api/webhooks/submissions`,
      description: 'Google Form 웹훅 URL',
      exportName: 'BaepdoongiSubmissionWebhookUrl',
    });

    new cdk.CfnOutput(this, 'PaymentWebhookUrl', {
      value: `${this.api.url}api/webhooks/payments`,
      description: 'Tasker 입금 알림 웹훅 URL',
      exportName: 'BaepdoongiPaymentWebhookUrl',
    });
  }
}
