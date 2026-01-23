/**
 * AWS Secrets Manager 서비스
 *
 * Slack 토큰 및 기타 민감한 정보를 안전하게 관리합니다.
 * Lambda 환경에서는 Secrets Manager를, 로컬에서는 환경 변수를 사용합니다.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

/** Slack 관련 시크릿 타입 */
export interface SlackSecrets {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_APP_TOKEN?: string; // Socket Mode용 (로컬 개발)
}

// AWS 클라이언트 (싱글톤)
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

// 캐시된 시크릿
let cachedSecrets: SlackSecrets | null = null;

/**
 * Secrets Manager에서 시크릿을 가져옵니다.
 * 결과는 캐싱되어 Lambda cold start 시 한 번만 호출됩니다.
 */
export async function getSecrets(): Promise<SlackSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  // 로컬 환경: 환경 변수 사용
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    cachedSecrets = {
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
      SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
      SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
    };

    validateSecrets(cachedSecrets);
    return cachedSecrets;
  }

  // Lambda 환경: Secrets Manager 사용
  const secretName = process.env.SLACK_SECRET_NAME;
  if (!secretName) {
    throw new Error('SLACK_SECRET_NAME 환경 변수가 설정되지 않았습니다.');
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('시크릿 값이 비어있습니다.');
    }

    cachedSecrets = JSON.parse(response.SecretString) as SlackSecrets;
    validateSecrets(cachedSecrets);

    return cachedSecrets;
  } catch (error) {
    console.error('시크릿 로드 실패:', error);
    throw error;
  }
}

/**
 * 필수 시크릿이 존재하는지 검증합니다.
 */
function validateSecrets(secrets: SlackSecrets): void {
  if (!secrets.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN이 설정되지 않았습니다.');
  }
  if (!secrets.SLACK_SIGNING_SECRET) {
    throw new Error('SLACK_SIGNING_SECRET이 설정되지 않았습니다.');
  }
}

/**
 * 캐시를 초기화합니다 (테스트용).
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
}
