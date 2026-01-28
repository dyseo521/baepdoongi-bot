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

    // Slack 토큰 및 웹훅 시크릿 (수동으로 값 설정 필요)
    // removalPolicy: RETAIN으로 스택 삭제/교체 시에도 시크릿 보존
    this.slackSecret = new secretsmanager.Secret(this, 'SlackSecret', {
      secretName: 'baepdoongi/slack-tokens',
      description: 'Slack Bot 토큰 및 웹훅 시크릿',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // 초기값은 플레이스홀더 - AWS Console에서 실제 값으로 업데이트 필요
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          // Slack 관련
          SLACK_BOT_TOKEN: 'xoxb-placeholder',
          SLACK_SIGNING_SECRET: 'placeholder',
          SLACK_APP_TOKEN: 'xapp-placeholder',
          // 웹훅 시크릿
          PAYMENT_WEBHOOK_SECRET: 'your-tasker-secret',
          FORM_WEBHOOK_SECRET: 'your-form-secret',
          // 대시보드 관리자 비밀번호
          ADMIN_PASSWORD: 'root', // 배포 후 반드시 변경!
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
      value: `
AWS Console에서 Secrets Manager로 이동하여 다음 값들을 업데이트하세요:
- SLACK_BOT_TOKEN: Slack 봇 토큰 (xoxb-...)
- SLACK_SIGNING_SECRET: Slack Signing Secret
- SLACK_APP_TOKEN: Socket Mode용 앱 토큰 (xapp-...)
- PAYMENT_WEBHOOK_SECRET: Tasker 웹훅 인증 시크릿
- FORM_WEBHOOK_SECRET: Google Form 웹훅 인증 시크릿
- ADMIN_PASSWORD: 대시보드 관리자 비밀번호 (기본값: root)
      `.trim(),
      description: '설정 안내',
    });
  }
}
