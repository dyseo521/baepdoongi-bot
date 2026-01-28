import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // 정적 SPA 빌드 (프로덕션 빌드 시에만)
  // 로컬 개발에서는 API 라우트와 함께 사용
  ...(isProduction && { output: 'export' }),

  // shared 패키지 트랜스파일
  transpilePackages: ['@baepdoongi/shared'],

  // barrel imports 자동 최적화 (번들 크기 감소)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
    ],
  },

  // 이미지 최적화 비활성화 (정적 빌드에서 필요)
  images: {
    unoptimized: true,
  },

  // 트레일링 슬래시 비활성화
  trailingSlash: false,
};

export default nextConfig;
