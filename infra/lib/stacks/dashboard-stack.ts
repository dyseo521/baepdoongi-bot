/**
 * 관리자 대시보드 스택
 *
 * S3 + CloudFront로 정적 SPA 대시보드를 배포합니다.
 * HTTPS 지원 및 글로벌 캐싱을 제공합니다.
 * API Gateway를 /api/* 경로로 프록시하여 same-origin으로 만듭니다.
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import type { Construct } from 'constructs';

interface DashboardStackProps extends cdk.StackProps {
  /** API Gateway URL (optional, for /api/* proxy) */
  apiUrl?: string;
}

export class DashboardStack extends cdk.Stack {
  /** 대시보드 호스팅 S3 버킷 */
  public readonly dashboardBucket: s3.Bucket;
  /** CloudFront 배포 */
  public readonly distribution: cloudfront.Distribution;
  /** CloudFront 도메인 (HTTPS) */
  public readonly dashboardDomain: string;

  constructor(scope: Construct, id: string, props?: DashboardStackProps) {
    super(scope, id, props);

    const { apiUrl } = props || {};

    // 대시보드 정적 파일 호스팅 버킷 (OAC 사용으로 퍼블릭 액세스 차단)
    this.dashboardBucket = new s3.Bucket(this, 'DashboardBucket', {
      bucketName: `baepdoongi-dashboard-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // CloudFront OAC 사용으로 직접 퍼블릭 액세스는 차단
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // SPA 라우팅용 웹사이트 호스팅은 비활성화 (CloudFront에서 처리)
    });

    // CloudFront Origin Access Control
    const oac = new cloudfront.S3OriginAccessControl(this, 'DashboardOAC', {
      originAccessControlName: 'baepdoongi-dashboard-oac',
    });

    // CloudFront Function: URL을 .html로 리라이트 (Next.js 정적 빌드용)
    const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewriteFunction', {
      functionName: 'baepdoongi-url-rewrite',
      comment: 'Rewrite clean URLs to .html files for Next.js static export',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 루트 경로는 index.html
  if (uri === '/') {
    request.uri = '/index.html';
    return request;
  }

  // 이미 확장자가 있으면 그대로
  if (uri.includes('.')) {
    return request;
  }

  // _next 경로는 그대로 (정적 자산)
  if (uri.startsWith('/_next/')) {
    return request;
  }

  // 클린 URL을 .html로 리라이트
  // /dashboard -> /dashboard.html
  // /payments/submissions -> /payments/submissions.html
  request.uri = uri + '.html';
  return request;
}
      `.trim()),
    });

    // API Gateway Origin (optional)
    // apiUrl format: https://xxx.execute-api.ap-northeast-2.amazonaws.com/prod/
    let additionalBehaviors: Record<string, cloudfront.BehaviorOptions> | undefined;

    if (apiUrl) {
      // Parse API Gateway URL to get domain and path
      const apiUrlObj = new URL(apiUrl);
      const apiOrigin = new origins.HttpOrigin(apiUrlObj.hostname, {
        originPath: apiUrlObj.pathname.replace(/\/$/, ''), // Remove trailing slash (e.g., /prod)
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      });

      additionalBehaviors = {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // API는 캐싱하지 않음
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      };
    }

    // CloudFront 배포
    this.distribution = new cloudfront.Distribution(this, 'DashboardDistribution', {
      comment: 'IGRUS Dashboard',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.dashboardBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        // URL 리라이트 함수 적용
        functionAssociations: [
          {
            function: urlRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      // API Gateway proxy (same-origin으로 쿠키 문제 해결)
      additionalBehaviors,
      // 404 에러 처리 (실제로 없는 파일 요청 시)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.seconds(10),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // 아시아, 북미, 유럽만 (비용 절감)
    });

    // CloudFront 도메인
    this.dashboardDomain = `https://${this.distribution.distributionDomainName}`;

    // 출력
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: this.dashboardDomain,
      description: '대시보드 URL (HTTPS)',
      exportName: 'BaepdoongiDashboardUrl',
    });

    new cdk.CfnOutput(this, 'DashboardBucketName', {
      value: this.dashboardBucket.bucketName,
      description: '대시보드 S3 버킷 이름',
      exportName: 'BaepdoongiDashboardBucketName',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront 배포 ID (캐시 무효화용)',
      exportName: 'BaepdoongiCloudFrontDistributionId',
    });

    // 배포 안내
    new cdk.CfnOutput(this, 'DeployInstructions', {
      value: `
대시보드 배포 방법:
1. cd packages/dashboard
2. NEXT_PUBLIC_API_URL=/api pnpm build  # CloudFront 프록시 사용 (same-origin)
3. aws s3 sync out/ s3://${this.dashboardBucket.bucketName} --delete
4. aws cloudfront create-invalidation --distribution-id ${this.distribution.distributionId} --paths "/*"
      `.trim(),
      description: '배포 안내',
    });
  }
}
