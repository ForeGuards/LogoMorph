import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set workspace root to silence multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
