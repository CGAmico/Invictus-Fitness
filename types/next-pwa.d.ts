// types/next-pwa.d.ts
declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  type Strategy = 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate';

  interface RuntimeCaching {
    urlPattern: RegExp;
    handler: Strategy;
    options?: any;
  }

  interface PWAOptions {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCaching[];
  }

  export default function withPWA(options?: PWAOptions): (nextConfig?: NextConfig) => NextConfig;
}
