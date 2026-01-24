/**
 * DynamoDB 테이블 스택
 *
 * Single Table Design을 사용하여 모든 엔티티를 단일 테이블에 저장합니다.
 * 엔티티: Member, Event, RSVP, Log, Session, Suggestion, Submission, Deposit, Match
 *
 * 주의: 기존 테이블이 있으면 참조하고, 없으면 새로 생성합니다.
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

const TABLE_NAME = 'baepdoongi-table';

export class DatabaseStack extends cdk.Stack {
  /** 메인 DynamoDB 테이블 */
  public readonly table: dynamodb.ITable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 기존 테이블 참조 (이미 존재하는 테이블 사용)
    // 테이블이 없으면 수동으로 생성 필요
    this.table = dynamodb.Table.fromTableName(this, 'BaepdoongiTable', TABLE_NAME);

    // 출력
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB 테이블 이름',
      exportName: 'BaepdoongiTableName',
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB 테이블 ARN',
      exportName: 'BaepdoongiTableArn',
    });
  }
}
