import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Non bloccare il build su errori ESLint (vercel)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Non bloccare il build su errori TypeScript
    ignoreBuildErrors: true,
    typescript: { ignoreBuildErrors: true },
  },
  experimental: {
    // se stai usando turbopack già va bene; lasciamo vuoto
  },
};

export default nextConfig;
