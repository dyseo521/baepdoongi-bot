import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@baepdoongi/shared'],
};

export default nextConfig;
