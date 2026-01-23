/**
 * Slack Bolt 앱 설정 및 Lambda 핸들러
 *
 * AWS Lambda에서 AwsLambdaReceiver를 사용하여 Slack 이벤트를 처리합니다.
 * 모든 이벤트, 커맨드, 액션 핸들러는 별도 모듈에서 등록됩니다.
 */

import pkg from '@slack/bolt';
import type { App as AppType, LogLevel as LogLevelType } from '@slack/bolt';
const { App, AwsLambdaReceiver, LogLevel } = pkg;
import type { AwsCallback, AwsEvent } from '@slack/bolt/dist/receivers/AwsLambdaReceiver.js';
import { getSecrets } from './services/secrets.service.js';
import { registerEventHandlers } from './handlers/events/index.js';
import { registerCommandHandlers } from './handlers/commands/index.js';
import { registerActionHandlers } from './handlers/actions/index.js';

// 환경 변수 검증
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const logLevel = (process.env.LOG_LEVEL as LogLevelType) || LogLevel.INFO;

// AWS Lambda Receiver 인스턴스 (Lambda 환경에서만 사용)
let awsLambdaReceiver: InstanceType<typeof AwsLambdaReceiver> | undefined;

// Bolt App 인스턴스
let app: AppType | undefined;

/**
 * Bolt 앱 초기화
 * Secrets Manager에서 토큰을 가져와 앱을 구성합니다.
 */
async function initializeApp(): Promise<AppType> {
  if (app) return app;

  const secrets = await getSecrets();

  if (isLambda) {
    // Lambda 환경: AwsLambdaReceiver 사용
    awsLambdaReceiver = new AwsLambdaReceiver({
      signingSecret: secrets.SLACK_SIGNING_SECRET,
    });

    app = new App({
      token: secrets.SLACK_BOT_TOKEN,
      receiver: awsLambdaReceiver,
      logLevel,
    });
  } else {
    // 로컬 환경: Socket Mode 사용
    app = new App({
      token: secrets.SLACK_BOT_TOKEN,
      signingSecret: secrets.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: secrets.SLACK_APP_TOKEN,
      logLevel,
    });
  }

  // 핸들러 등록
  registerEventHandlers(app);
  registerCommandHandlers(app);
  registerActionHandlers(app);

  return app;
}

/**
 * AWS Lambda 핸들러
 * API Gateway로부터 이벤트를 받아 Slack 요청을 처리합니다.
 */
export async function handler(
  event: AwsEvent,
  context: unknown,
  callback: AwsCallback
): Promise<unknown> {
  await initializeApp();

  if (!awsLambdaReceiver) {
    throw new Error('AwsLambdaReceiver가 초기화되지 않았습니다.');
  }

  const lambdaHandler = await awsLambdaReceiver.start();
  return lambdaHandler(event, context, callback);
}

// 로컬 개발용 내보내기
export { initializeApp };
