// app/_components/RegisterSW.tsx
'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error);
    }
  }, []);
  return null;
}export const metadata = {
  title: 'Invictus Fitness',
  description: 'PT & members',
  manifest: '/manifest.json', // lasciamo il tuo path
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-512x512.png' }],
  },
  applicationName: 'Invictus Fitness',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Invictus Fitness',
  },
};

