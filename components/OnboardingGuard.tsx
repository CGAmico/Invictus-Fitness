'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';

/**
 * Mostra un banner di promemoria se il profilo è incompleto.
 * Nessun redirect. Il banner si può ignorare (viene ricordato in localStorage).
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { loading, needsOnboarding, userId } = useProfile();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<boolean>(false);

  const storageKey = userId ? `invictus_onboarding_dismissed_${userId}` : 'invictus_onboarding_dismissed';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setDismissed(raw === '1');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const isPublic =
    pathname === '/login' ||
    pathname === '/reset' ||
    pathname?.startsWith('/api');

  const showBanner = !loading && needsOnboarding && !isPublic && pathname !== '/account' && !dismissed;

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <>
      {showBanner && (
        <div className="bg-amber-500/10 border-b border-amber-600 text-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-2 text-sm flex flex-wrap items-center gap-3">
            <span>Completa il tuo profilo per ottenere suggerimenti migliori (sesso, data di nascita, altezza, peso).</span>
            <Link
              href="/account"
              className="ml-auto px-3 py-1 rounded bg-amber-600 text-white hover:opacity-90"
            >
              Completa ora
            </Link>
            <button
              onClick={dismiss}
              className="px-3 py-1 rounded border border-amber-600 hover:bg-amber-600/20"
              aria-label="Nascondi promemoria"
            >
              Più tardi
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
