/**
 * Bedrock Knowledge Base 스택
 *
 * RAG(Retrieval-Augmented Generation)를 위한 인프라를 구성합니다.
 * Knowledge Base는 AWS Console에서 수동 생성이 필요합니다 (CDK L2 미지원).
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export class BedrockStack extends cdk.Stack {
  /** 지식 문서 저장 S3 버킷 */
  public readonly knowledgeBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Knowledge Base 소스 문서용 S3 버킷
    this.knowledgeBucket = new s3.Bucket(this, 'KnowledgeBucket', {
      bucketName: `baepdoongi-knowledge-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true, // 버전 관리 활성화
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // 30일 후 이전 버전 삭제
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Bedrock 서비스 역할 (Knowledge Base가 S3에 접근할 수 있도록)
    const bedrockRole = new iam.Role(this, 'BedrockKnowledgeBaseRole', {
      roleName: 'baepdoongi-bedrock-kb-role',
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Knowledge Base to access S3',
    });

    // S3 읽기 권한 부여
    this.knowledgeBucket.grantRead(bedrockRole);

    // Bedrock 모델 호출 권한
    bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      })
    );

    // 출력
    new cdk.CfnOutput(this, 'KnowledgeBucketName', {
      value: this.knowledgeBucket.bucketName,
      description: '지식 문서 S3 버킷 이름',
      exportName: 'BaepdoongiKnowledgeBucketName',
    });

    new cdk.CfnOutput(this, 'KnowledgeBucketArn', {
      value: this.knowledgeBucket.bucketArn,
      description: '지식 문서 S3 버킷 ARN',
      exportName: 'BaepdoongiKnowledgeBucketArn',
    });

    new cdk.CfnOutput(this, 'BedrockRoleArn', {
      value: bedrockRole.roleArn,
      description: 'Bedrock Knowledge Base 역할 ARN',
      exportName: 'BaepdoongiBedrockRoleArn',
    });

    // Knowledge Base 수동 생성 안내
    new cdk.CfnOutput(this, 'KnowledgeBaseInstructions', {
      value: `
AWS Console에서 Bedrock Knowledge Base를 생성하세요:
1. Amazon Bedrock > Knowledge bases > Create knowledge base
2. Name: baepdoongi-kb
3. IAM Role: 위에서 생성된 역할 선택
4. Data source: S3 - ${this.knowledgeBucket.bucketName}
5. Embedding model: Titan Embeddings G1 - Text v2
6. Vector store: S3 vector bucket (Quick create 권장)
   - 비용 90% 절감 (vs OpenSearch Serverless)
   - sub-100ms 쿼리 레이턴시
   - 자동 vector bucket 생성 및 관리

생성 후 Knowledge Base ID를 환경 변수에 설정하세요.
      `.trim(),
      description: 'Knowledge Base 생성 안내',
    });
  }
}
