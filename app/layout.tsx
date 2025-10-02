import './globals.css';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import OnboardingGuard from '@/components/OnboardingGuard';
import PWARegister from '@/components/PWARegister';

export const metadata = {
  title: 'Invictus Fitness',
  description: 'PT & members',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-512x512.png',
  },
  // Colore tema per browser UI / PWA (bordeaux brand)
  themeColor: '#7A1F2B',
  applicationName: 'Invictus Fitness',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Invictus Fitness',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Colore barra indirizzi mobile / PWA */}
        <meta name="theme-color" content="#7A1F2B" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        {/* Suggerimento: se hai un bordeaux diverso, sostituisci #7A1F2B qui e in globals.css */}
      </head>
      <body className="min-h-dvh bg-black text-white">
        <ThemeProvider>
          <PWARegister />
          <Navbar />
          {/* OnboardingGuard reindirizza su /account se i dati profilo base non sono completi */}
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
