// components/PWARegister.tsx
'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        //quando il browser trova un nuovo SW
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller // c'era già un SW attivo → c'è un update
            ) {
              // chiedi al nuovo SW di attivarsi subito…
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // …e ricarica per ottenere i file aggiornati
              window.location.reload();
            }
          });
        });
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
