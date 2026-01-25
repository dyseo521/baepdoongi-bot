/**
 * Bedrock Knowledge Base 스택
 *
 * RAG(Retrieval-Augmented Generation)를 위한 인프라를 구성합니다.
 * S3 Vectors를 벡터 저장소로 사용하며, Knowledge Base는 스크립트로 생성합니다.
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3vectors from 'aws-cdk-lib/aws-s3vectors';
import type { Construct } from 'constructs';

export class BedrockStack extends cdk.Stack {
  /** 지식 문서 저장 S3 버킷 */
  public readonly knowledgeBucket: s3.Bucket;

  /** S3 Vectors 버킷 이름 */
  public readonly vectorBucketName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Vectors 버킷 생성 (벡터 임베딩 저장용)
    this.vectorBucketName = `baepdoongi-vectors-${this.account}-${this.region}`;
    const vectorBucket = new s3vectors.CfnVectorBucket(this, 'VectorBucket', {
      vectorBucketName: this.vectorBucketName,
      encryptionConfiguration: {
        sseType: 'AES256', // SSE-S3 암호화
      },
    });

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

    // Bedrock 서비스 역할 (Knowledge Base가 S3와 S3 Vectors에 접근할 수 있도록)
    const bedrockRole = new iam.Role(this, 'BedrockKnowledgeBaseRole', {
      roleName: 'baepdoongi-bedrock-kb-role',
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Knowledge Base to access S3 and S3 Vectors',
    });

    // S3 읽기 권한 부여
    this.knowledgeBucket.grantRead(bedrockRole);

    // S3 Vectors 권한 추가
    bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3vectors:CreateIndex',
          's3vectors:DeleteIndex',
          's3vectors:GetIndex',
          's3vectors:ListIndexes',
          's3vectors:QueryVectors',
          's3vectors:GetVectors',
          's3vectors:PutVectors',
          's3vectors:DeleteVectors',
        ],
        resources: [
          `arn:aws:s3vectors:${this.region}:${this.account}:bucket/${this.vectorBucketName}`,
          `arn:aws:s3vectors:${this.region}:${this.account}:bucket/${this.vectorBucketName}/index/*`,
        ],
      })
    );

    // Bedrock 모델 호출 권한 (Claude 4.5 Haiku/Sonnet + Titan Embed)
    bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          // Claude 4.5 모델
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
          // 임베딩 모델
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
          // 레거시 모델 (호환성)
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
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

    new cdk.CfnOutput(this, 'VectorBucketName', {
      value: this.vectorBucketName,
      description: 'S3 Vectors 버킷 이름',
      exportName: 'BaepdoongiVectorBucketName',
    });

    new cdk.CfnOutput(this, 'VectorBucketArn', {
      value: vectorBucket.attrVectorBucketArn,
      description: 'S3 Vectors 버킷 ARN',
      exportName: 'BaepdoongiVectorBucketArn',
    });

    new cdk.CfnOutput(this, 'BedrockRoleArn', {
      value: bedrockRole.roleArn,
      description: 'Bedrock Knowledge Base 역할 ARN',
      exportName: 'BaepdoongiBedrockRoleArn',
    });

    // Knowledge Base 자동 생성 안내
    new cdk.CfnOutput(this, 'KnowledgeBaseInstructions', {
      value: `
Knowledge Base 자동 생성:
  npx tsx scripts/setup-knowledge-base.ts

수동 생성 (AWS Console):
1. Amazon Bedrock > Knowledge bases > Create
2. Name: baepdoongi-kb
3. IAM Role: ${bedrockRole.roleName}
4. Data source: S3 - ${this.knowledgeBucket.bucketName}
5. Embedding: Titan Embeddings v2 (1024 dim)
6. Vector store: S3 Vectors - ${this.vectorBucketName}
      `.trim(),
      description: 'Knowledge Base 생성 안내',
    });
  }
}
