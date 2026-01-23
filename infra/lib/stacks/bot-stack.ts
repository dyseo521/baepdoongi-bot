/**
 * Slack Bot 스택
 *
 * Lambda 함수, API Gateway, SQS를 포함합니다.
 * Slack 이벤트 수신 및 RAG 질문 처리를 담당합니다.
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
  table: dynamodb.Table;
  /** Slack 시크릿 */
  slackSecret: secretsmanager.Secret;
  /** Knowledge Base S3 버킷 */
  knowledgeBucket: s3.Bucket;
}

export class BotStack extends cdk.Stack {
  /** Slack 이벤트 처리 Lambda */
  public readonly botLambda: lambda.Function;
  /** RAG 처리 Lambda */
  public readonly ragLambda: lambda.Function;
  /** 이름 검사 Lambda */
  public readonly nameCheckerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: BotStackProps) {
    super(scope, id, props);

    const { table, slackSecret, knowledgeBucket } = props;

    // SQS 큐: RAG 비동기 처리용 (Slack 3초 제한 대응)
    const ragQueue = new sqs.Queue(this, 'RagQueue', {
      queueName: 'baepdoongi-rag-queue',
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(1),
    });

    // 공통 Lambda 환경 변수
    const commonEnv = {
      DYNAMODB_TABLE_NAME: table.tableName,
      SLACK_SECRET_NAME: slackSecret.secretName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    // 메인 Bot Lambda (Slack 이벤트 핸들러)
    this.botLambda = new lambda.Function(this, 'BotLambda', {
      functionName: 'baepdoongi-bot',
      description: 'Slack Bolt 이벤트 핸들러',
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
        BEDROCK_KNOWLEDGE_BASE_ID: cdk.Fn.importValue('BaepdoongiKnowledgeBaseId'),
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

    // SQS를 RAG Lambda의 이벤트 소스로 연결
    this.ragLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(ragQueue, {
        batchSize: 1,
      })
    );

    // 권한 부여
    table.grantReadWriteData(this.botLambda);
    table.grantReadWriteData(this.ragLambda);
    table.grantReadWriteData(this.nameCheckerLambda);

    slackSecret.grantRead(this.botLambda);
    slackSecret.grantRead(this.ragLambda);
    slackSecret.grantRead(this.nameCheckerLambda);

    ragQueue.grantSendMessages(this.botLambda);
    ragQueue.grantConsumeMessages(this.ragLambda);

    knowledgeBucket.grantRead(this.ragLambda);

    // Bedrock 권한
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:RetrieveAndGenerate',
        'bedrock:Retrieve',
      ],
      resources: ['*'],
    });
    this.ragLambda.addToRolePolicy(bedrockPolicy);

    // API Gateway
    const api = new apigateway.RestApi(this, 'BotApi', {
      restApiName: 'baepdoongi-api',
      description: 'Slack Bot API Gateway',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    // /slack/events 엔드포인트
    const slackEvents = api.root.addResource('slack').addResource('events');
    slackEvents.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.botLambda, {
        timeout: cdk.Duration.seconds(29),
      })
    );

    // 출력
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway 엔드포인트',
      exportName: 'BaepdoongiApiEndpoint',
    });

    new cdk.CfnOutput(this, 'SlackEventsUrl', {
      value: `${api.url}slack/events`,
      description: 'Slack Event Subscriptions URL',
      exportName: 'BaepdoongiSlackEventsUrl',
    });
  }
}
