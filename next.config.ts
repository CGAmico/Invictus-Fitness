// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // caching base: asset statici + pagine
  runtimeCaching: [
    {
      // css, js, immagini, font
      urlPattern: ({ request }) =>
        ['style', 'script', 'image', 'font'].includes(request.destination),
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 giorni
      },
    },
    {
      // pagine del tuo dominio
      urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
      },
    },
  ],
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {},
};

export default withPWA(nextConfig);
