/**
 * EventBridge 스케줄러 스택
 *
 * 주기적으로 실행되는 작업들을 관리합니다.
 * - 이름 형식 검사 (3일 주기)
 * - 이벤트 리마인더
 */

import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

interface SchedulerStackProps extends cdk.StackProps {
  /** 이름 검사 Lambda */
  nameCheckerLambda: lambda.Function;
}

export class SchedulerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SchedulerStackProps) {
    super(scope, id, props);

    const { nameCheckerLambda } = props;

    // 이름 형식 검사 스케줄 (3일마다 오전 9시 KST = UTC 00:00)
    const nameCheckRule = new events.Rule(this, 'NameCheckRule', {
      ruleName: 'baepdoongi-name-check',
      description: '3일마다 이름 형식 미준수 회원 검사 및 경고 발송',
      // 매주 월, 목요일 오전 9시 (KST)
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '0', // UTC 00:00 = KST 09:00
        weekDay: 'MON,THU',
      }),
      enabled: true,
    });

    // Lambda를 타겟으로 설정
    nameCheckRule.addTarget(
      new targets.LambdaFunction(nameCheckerLambda, {
        event: events.RuleTargetInput.fromObject({
          source: 'scheduler',
          action: 'name-check',
          timestamp: events.EventField.time,
        }),
        retryAttempts: 2,
      })
    );

    // 출력
    new cdk.CfnOutput(this, 'NameCheckRuleArn', {
      value: nameCheckRule.ruleArn,
      description: '이름 검사 스케줄 Rule ARN',
    });

    new cdk.CfnOutput(this, 'ScheduleInfo', {
      value: '매주 월/목 오전 9시 (KST)에 이름 형식 검사 실행',
      description: '스케줄 정보',
    });
  }
}
