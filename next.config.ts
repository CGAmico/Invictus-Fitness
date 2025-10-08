// next.config.ts
import type { NextConfig } from 'next';

// usa require per next-pwa in TS, come stai già facendo
const withPWA =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      { // asset Next
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      { // immagini / font / icone
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      { // pagine (evita asset noti)
        urlPattern: /^https?.*(?<!\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?))$/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
      },
    ],
  });

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }],
      },
      {
        // ATTENZIONE: se il file si chiama .webmanifest, fai puntare anche il layout a /manifest.webmanifest
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }],
      },
    ];
  },

  // 🔁 redirect robusto su root
  async redirects() {
    return [{ source: '/', destination: '/login', permanent: false }];
  },
};

export default withPWA(nextConfig);
