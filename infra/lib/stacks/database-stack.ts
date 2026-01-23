/**
 * DynamoDB 테이블 스택
 *
 * Single Table Design을 사용하여 모든 엔티티를 단일 테이블에 저장합니다.
 * 엔티티: Member, Event, RSVP, Log, Session, Suggestion, Submission, Deposit, Match
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  /** 메인 DynamoDB 테이블 */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 메인 테이블 생성
    this.table = new dynamodb.Table(this, 'BaepdoongiTable', {
      tableName: 'baepdoongi-table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-Demand
      removalPolicy: cdk.RemovalPolicy.RETAIN, // 삭제 방지
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true, // PITR 활성화
      },
      timeToLiveAttribute: 'ttl', // TTL 필드 (Log, Session 자동 삭제용)
    });

    // GSI1: 엔티티별 쿼리용
    // - Member: GSI1PK = 'MEMBER', GSI1SK = 'MEMBER#{joinedAt}'
    // - Event: GSI1PK = 'EVENT', GSI1SK = 'EVENT#{datetime}'
    // - RSVP: GSI1PK = 'MEMBER#{memberId}', GSI1SK = 'RSVP#{eventId}'
    // - Suggestion: GSI1PK = 'SUGGESTION', GSI1SK = 'SUGGESTION#{createdAt}'
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: 결제 시스템 상태별 쿼리용
    // - Submission: GSI2PK = 'SUB_STATUS#{status}', GSI2SK = '{createdAt}'
    // - Deposit: GSI2PK = 'DEP_STATUS#{status}', GSI2SK = '{timestamp}'
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

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
