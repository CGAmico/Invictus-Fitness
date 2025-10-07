// next.config.ts
import type { NextConfig } from 'next';

// next-pwa non ha tipizzazioni ufficiali in molte setup TS.
// Usiamo require per evitare errori di typing in VS Code/TS.
const withPWA =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('next-pwa')({
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
        // Pagine (evita asset noti)
        urlPattern:
          /^https?.*(?<!\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?))$/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
      },
    ],
  });

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Importante per evitare cache ostinate del PWA tra una release e l’altra
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },

  // ⚠️ RIMOSSO il redirect "/" → "/login"
  // Ora la decisione di dove andare la prende app/page.tsx in base alla sessione.
};

export default withPWA(nextConfig);
