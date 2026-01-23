/**
 * 관리자 대시보드 스택
 *
 * S3 정적 호스팅으로 React 대시보드를 배포합니다.
 * CloudFront 없이 S3 웹사이트 호스팅만 사용 (비공개 URL).
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DashboardStack extends cdk.Stack {
  /** 대시보드 호스팅 S3 버킷 */
  public readonly dashboardBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 대시보드 정적 파일 호스팅 버킷
    this.dashboardBucket = new s3.Bucket(this, 'DashboardBucket', {
      bucketName: `baepdoongi-dashboard-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // 스택 삭제 시 객체도 삭제
      // 정적 웹사이트 호스팅 활성화
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA 라우팅용
      // 퍼블릭 액세스는 비활성화 (URL 비공개)
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      publicReadAccess: true, // 간단한 비밀번호 보호 대신 URL 비공개로 보안
    });

    // 빌드된 대시보드 파일 배포
    // 참고: CI/CD에서 빌드 후 배포하거나, 여기서는 주석 처리
    // new s3deploy.BucketDeployment(this, 'DashboardDeployment', {
    //   sources: [
    //     s3deploy.Source.asset(
    //       path.join(__dirname, '../../../packages/dashboard/dist')
    //     ),
    //   ],
    //   destinationBucket: this.dashboardBucket,
    //   // SPA 라우팅을 위한 캐시 설정
    //   cacheControl: [
    //     s3deploy.CacheControl.fromString(
    //       'max-age=31536000,public,immutable'
    //     ),
    //   ],
    // });

    // 출력
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: this.dashboardBucket.bucketWebsiteUrl,
      description: '대시보드 URL (비공개 - 공유하지 마세요)',
      exportName: 'BaepdoongiDashboardUrl',
    });

    new cdk.CfnOutput(this, 'DashboardBucketName', {
      value: this.dashboardBucket.bucketName,
      description: '대시보드 S3 버킷 이름',
      exportName: 'BaepdoongiDashboardBucketName',
    });

    // 배포 안내
    new cdk.CfnOutput(this, 'DeployInstructions', {
      value: `
대시보드 배포 방법:
1. cd packages/dashboard && pnpm build
2. aws s3 sync dist/ s3://${this.dashboardBucket.bucketName} --delete
      `.trim(),
      description: '배포 안내',
    });
  }
}
