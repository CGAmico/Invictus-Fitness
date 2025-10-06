// app/layout.tsx
import './globals.css';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import OnboardingGuard from '@/components/OnboardingGuard';
import PWARegister from '@/components/PWARegister';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Invictus Fitness',
  description: 'PT & members',
  applicationName: 'Invictus Fitness',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Invictus Fitness',
  },
};

export const viewport: Viewport = {
  // Spostato qui per evitare i warning di Next
  themeColor: '#7A1F2B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Manifest esplicito (alcuni UA lo preferiscono) */}
        <link rel="manifest" href="/manifest.json" />

        {/* Colore barra indirizzi / PWA (Next lo genera già da viewport, tenerlo è ok) */}
        <meta name="theme-color" content="#7A1F2B" />

        {/* iOS PWA fallback */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Invictus Fitness" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180.png" />

        {/* Android progressive (non obbligatorio ma utile) */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Invictus Fitness" />
      </head>
      <body className="min-h-dvh bg-black text-white">
        <ThemeProvider>
          {/* Registrazione SW (vedi componente sotto) */}
          <PWARegister />

          <Navbar />
          <OnboardingGuard>
            <main className="max-w-5xl mx-auto px-4 py-4 print-page">
              {children}
            </main>
            <footer className="no-print mt-12 text-xs text-neutral-400 text-center">
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span> — Invictus Fitness
            </footer>
          </OnboardingGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
