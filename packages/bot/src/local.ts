/**
 * 로컬 개발 서버
 *
 * Socket Mode를 사용하여 로컬에서 Slack 봇을 실행합니다.
 * ngrok 없이도 Slack 이벤트를 수신할 수 있습니다.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// .env.local 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { initializeApp } from './app.js';

async function main(): Promise<void> {
  console.log('🚀 뱁둥이 봇 시작 중...');

  const app = await initializeApp();
  await app.start();

  console.log('⚡️ 뱁둥이 봇이 실행 중입니다!');
  console.log('💡 종료하려면 Ctrl+C를 누르세요.');
}

main().catch((error) => {
  console.error('❌ 봇 시작 실패:', error);
  process.exit(1);
});
