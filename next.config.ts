// next.config.ts
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import path from 'path'; // 👈 aggiungi questo

const withPWAConfigured = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // pagine (evita asset noti)
      urlPattern: /^https?.*(?<!\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?))$/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
    },
  ],
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

 // 👉 Alias webpack per supportare `@/` ovunque (server & client, build inclusa)
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname), // `@` punta alla root del progetto
    };
    return config;
  },

  async redirects() {
    return [
      { source: '/', destination: '/login', permanent: false },
    ];
  },
};

export default withPWAConfigured(nextConfig);
