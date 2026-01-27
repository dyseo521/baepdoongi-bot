/**
 * CI/CD 스택
 *
 * GitHub Actions OIDC 인증을 위한 리소스를 정의합니다.
 * - GitHub OIDC Identity Provider
 * - GitHub Actions IAM Role (배포 권한)
 */

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

interface CiCdStackProps extends cdk.StackProps {
  /** GitHub 저장소 (owner/repo 형식) */
  githubRepo: string;
  /** Dashboard S3 버킷 이름 */
  dashboardBucketName: string;
  /** CloudFront 배포 ID */
  cloudFrontDistributionId: string;
}

export class CiCdStack extends cdk.Stack {
  /** GitHub Actions IAM Role ARN */
  public readonly githubActionsRoleArn: string;

  constructor(scope: Construct, id: string, props: CiCdStackProps) {
    super(scope, id, props);

    const { githubRepo, dashboardBucketName, cloudFrontDistributionId } = props;

    // GitHub OIDC Provider (기존 Provider 참조)
    // 계정에 이미 GitHub OIDC Provider가 존재하면 참조, 없으면 생성
    const oidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;
    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidcProvider',
      oidcProviderArn
    );

    // GitHub Actions IAM Role
    const role = new iam.Role(this, 'GitHubActionsRole', {
      roleName: 'baepdoongi-github-actions',
      description: 'GitHub Actions CI/CD deployment role for baepdoongi-bot',
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          // production 환경에서만 assume 가능 (workflow의 environment: production)
          'token.actions.githubusercontent.com:sub': `repo:${githubRepo}:environment:production`,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Dashboard 배포 권한 (S3)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DashboardS3Access',
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:GetObject'],
        resources: [
          `arn:aws:s3:::${dashboardBucketName}`,
          `arn:aws:s3:::${dashboardBucketName}/*`,
        ],
      })
    );

    // Dashboard 배포 권한 (CloudFront)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${cloudFrontDistributionId}`,
        ],
      })
    );

    // CDK 배포 권한 (CloudFormation)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:GetTemplate',
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DeleteChangeSet',
          'cloudformation:GetStackPolicy',
        ],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/Baepdoongi*/*`,
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`,
        ],
      })
    );

    // CDK 배포 권한 (S3 - CDK Assets)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CdkAssetsS3Access',
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}`,
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}/*`,
        ],
      })
    );

    // Lambda 배포 권한
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'LambdaDeployAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'lambda:UpdateFunctionCode',
          'lambda:UpdateFunctionConfiguration',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:PublishVersion',
          'lambda:CreateAlias',
          'lambda:UpdateAlias',
          'lambda:AddPermission',
          'lambda:RemovePermission',
        ],
        resources: [`arn:aws:lambda:${this.region}:${this.account}:function:baepdoongi-*`],
      })
    );

    // IAM PassRole (Lambda 실행 역할 전달용)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'IamPassRole',
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [`arn:aws:iam::${this.account}:role/Baepdoongi*`],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'lambda.amazonaws.com',
          },
        },
      })
    );

    // SSM 파라미터 읽기 (CDK 배포 시 필요)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SsmParameterAccess',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`],
      })
    );

    // STS 권한 (CDK 배포 시 필요)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'StsAccess',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-*-deploy-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-*-file-publishing-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-*-image-publishing-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-*-lookup-role-${this.account}-${this.region}`,
        ],
      })
    );

    this.githubActionsRoleArn = role.roleArn;

    // 출력
    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
      value: role.roleArn,
      description: 'GitHub Actions IAM Role ARN',
      exportName: 'BaepdoongiGitHubActionsRoleArn',
    });
  }
}
