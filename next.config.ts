import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Non bloccare la build per errori ESLint in CI/Vercel
  eslint: { ignoreDuringBuilds: true },

  // Non bloccare la build per errori TypeScript in CI/Vercel
  typescript: { ignoreBuildErrors: true },

  // Se non usi feature sperimentali, puoi anche rimuovere del tutto "experimental"
  experimental: {},
};

export default nextConfig;
