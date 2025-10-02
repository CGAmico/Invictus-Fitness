'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { routeForRole } from '@/lib/redirectAfterLogin';
import { card } from '@/components/ui';

// Evita qualsiasi prerendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createClient();
  const [msg, setMsg] = useState('Verifica in corso…');

  useEffect(() => {
    (async () => {
      try {
        // 1) Scambia il code del link email con una sessione (solo client)
        const href = typeof window !== 'undefined' ? window.location.href : '';
        const { error } = await supabase.auth.exchangeCodeForSession(href);
        if (error) { setMsg(error.message); return; }

        // 2) Ottieni l'utente
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMsg('Nessun utente in sessione'); return; }

        // 3) Ruolo dal profilo (default: member)
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        let role: 'owner' | 'trainer' | 'member' =
          (prof?.role as any) ?? 'member';

        if (!prof?.role) {
          await supabase.from('profiles').update({ role: 'member' }).eq('id', user.id);
          role = 'member';
        }

        // 4) Rispetta ?next=... se presente
        let next: string | null = null;
        if (typeof window !== 'undefined') {
          try { next = new URL(window.location.href).searchParams.get('next'); } catch {}
        }

        router.replace(next || routeForRole(role));
      } catch (e: any) {
        setMsg(e?.message || 'Errore di conferma');
      }
    })();
  }, [router, supabase]);

  return (
    <div className="max-w-md mx-auto">
      <div className={card}>{msg}</div>
    </div>
  );
}
