'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
      } catch (e) {
        console.warn('SW registration failed', e);
      }
    };
    register();
  }, []);

  return null;
}
