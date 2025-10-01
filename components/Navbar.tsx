'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import ThemeToggle from '@/components/ThemeToggle';
import { useProfile } from '@/lib/useProfile';

export default function Navbar() {
  const supabase = createClient();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const { loading, isOwner, isTrainer, role } = useProfile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const signOut = async () => {
    await supabase.auth.signOut();
    location.href = '/login';
  };

  const navItems = useMemo(() => {
    const base = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/programs',  label: 'Programmi' },
      { href: '/sessions',  label: 'Sessioni' },
      { href: '/progress',  label: 'Progressi' },
    ];
    if (isOwner || isTrainer) {
      base.splice(2, 0, { href: '/exercises', label: 'Esercizi' });
      base.push({ href: '/trainer/clients', label: 'Clienti' });
      base.push({ href: '/machines', label: 'Macchine' });
    }
    if (isOwner) base.push({ href: '/admin/users', label: 'Utenti' });
    return base;
  }, [isOwner, isTrainer]);

  const RolePill = () => (
    <span
      className="
        px-2 py-1 text-xs rounded
        border border-[var(--brand-600)]/60
        bg-[var(--brand-600)]/20
        text-[var(--foreground)] opacity-90
      "
    >
      {loading ? 'ruolo: …' : `ruolo: ${role ?? '—'}`}
    </span>
  );

  const baseLink =
    'px-3 py-1.5 rounded border text-sm transition ' +
    'border-[#2a2a2a] text-white/90 hover:border-[var(--brand-400)]';

  const activeLink =
    'px-3 py-1.5 rounded border text-sm transition ' +
    'border-[var(--brand)] text-white relative ' +
    'after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-[var(--brand)]';

  return (
    <div className="no-print sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-[#1f1f1f] text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-base sm:text-lg font-bold tracking-wide">
          Invictus Fitness
        </Link>

        {/* Desktop */}
        <nav className="hidden sm:flex items-center gap-3 text-sm">
          {navItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={isActive(it.href) ? activeLink : baseLink}
            >
              {it.label}
            </Link>
          ))}

          {loggedIn && (
            <Link
              href="/account"
              className={isActive('/account') ? activeLink : baseLink}
            >
              Account
            </Link>
          )}

          <RolePill />

          {loading ? (
            <span className="px-2 text-sm opacity-70">carico…</span>
          ) : loggedIn ? (
            <button
              onClick={signOut}
              className="px-3 py-1.5 rounded border border-[#2a2a2a] text-white/90 hover:border-[var(--brand-400)] transition"
            >
              Esci
            </button>
          ) : (
            <Link
              href="/login"
              className={isActive('/login') ? activeLink : baseLink}
            >
              Login
            </Link>
          )}
          <ThemeToggle />
        </nav>

        {/* Mobile hamburger */}
        <button
          aria-label="Apri menu"
          className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded border border-[#2a2a2a]"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            {open ? (
              <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t border-[#1f1f1f] bg-black/95 text-white">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-2">
            {navItems.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={
                  'px-3 py-2 rounded border ' +
                  (isActive(it.href)
                    ? 'border-[var(--brand)]'
                    : 'border-[#2a2a2a] hover:border-[var(--brand-400)]')
                }
              >
                {it.label}
              </Link>
            ))}

            {loggedIn && (
              <Link
                href="/account"
                className={
                  'px-3 py-2 rounded border ' +
                  (isActive('/account')
                    ? 'border-[var(--brand)]'
                    : 'border-[#2a2a2a] hover:border-[var(--brand-400)]')
                }
              >
                Account
              </Link>
            )}

            <RolePill />

            {loading ? (
              <span className="px-2 py-2 text-sm opacity-70">carico…</span>
            ) : loggedIn ? (
              <button
                onClick={signOut}
                className="px-3 py-2 rounded border border-[#2a2a2a] text-left hover:border-[var(--brand-400)] transition"
              >
                Esci
              </button>
            ) : (
              <Link
                href="/login"
                className={
                  'px-3 py-2 rounded border ' +
                  (isActive('/login')
                    ? 'border-[var(--brand)]'
                    : 'border-[#2a2a2a] hover:border-[var(--brand-400)]')
                }
              >
                Login
              </Link>
            )}
            <ThemeToggle />
          </nav>
        </div>
      )}
    </div>
  );
}
