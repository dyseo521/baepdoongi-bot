/**
 * Secrets Manager 스택
 *
 * Slack 토큰 및 기타 민감한 정보를 안전하게 저장합니다.
 */

import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

export class SecretsStack extends cdk.Stack {
  /** Slack 시크릿 */
  public readonly slackSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Slack 토큰 시크릿 (수동으로 값 설정 필요)
    this.slackSecret = new secretsmanager.Secret(this, 'SlackSecret', {
      secretName: 'baepdoongi/slack-tokens',
      description: 'Slack Bot 및 App 토큰',
      // 초기값은 플레이스홀더 - AWS Console에서 실제 값으로 업데이트 필요
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          SLACK_BOT_TOKEN: 'xoxb-placeholder',
          SLACK_SIGNING_SECRET: 'placeholder',
          SLACK_APP_TOKEN: 'xapp-placeholder',
        }),
        generateStringKey: '_placeholder',
      },
    });

    // 출력
    new cdk.CfnOutput(this, 'SlackSecretArn', {
      value: this.slackSecret.secretArn,
      description: 'Slack 시크릿 ARN',
      exportName: 'BaepdoongiSlackSecretArn',
    });

    new cdk.CfnOutput(this, 'SlackSecretName', {
      value: this.slackSecret.secretName,
      description: 'Slack 시크릿 이름',
      exportName: 'BaepdoongiSlackSecretName',
    });

    // 사용 안내
    new cdk.CfnOutput(this, 'SetupInstructions', {
      value:
        'AWS Console에서 Secrets Manager로 이동하여 실제 Slack 토큰으로 업데이트하세요.',
      description: '설정 안내',
    });
  }
}
