import * as esbuild from 'esbuild';

const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',  // CommonJS로 변경 (package.json 불필요)
  sourcemap: true,
  minify: false,
  // AWS SDK v3는 Lambda에 내장되어 있으므로 번들에서 제외
  external: [
    '@aws-sdk/*',
  ],
};

// 빌드 실행
await Promise.all([
  // 메인 Bot Lambda (Slack + API + Webhooks)
  esbuild.build({
    ...commonConfig,
    entryPoints: ['src/app.ts'],
    outfile: 'dist/app.js',
  }),
  // RAG Lambda (SQS 트리거)
  esbuild.build({
    ...commonConfig,
    entryPoints: ['src/rag-handler.ts'],
    outfile: 'dist/rag-handler.js',
  }),
  // Name Checker Lambda (스케줄러 트리거)
  esbuild.build({
    ...commonConfig,
    entryPoints: ['src/name-checker.ts'],
    outfile: 'dist/name-checker.js',
  }),
  // DM Worker Lambda (SQS 트리거)
  esbuild.build({
    ...commonConfig,
    entryPoints: ['src/dm-worker.ts'],
    outfile: 'dist/dm-worker.js',
  }),
]);

console.log('Build completed successfully!');
