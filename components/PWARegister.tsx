// components/PWARegister.tsx
'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // opzionale: ascolta aggiornamenti
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // la pagina usa un SW nuovo: potresti fare un toast "Aggiornato"
        });
      } catch (err) {
        console.error('SW registration failed', err);
      }
    };

    register();
  }, []);

  return null;
}
