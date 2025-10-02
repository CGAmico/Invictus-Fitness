// app/login/confirm/ConfirmClient.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { routeForRole } from '@/lib/redirectAfterLogin';
import { card } from '@/components/ui';

function Inner() {
  const router = useRouter();
  const supabase = createClient();
  const search = useSearchParams();
  const [msg, setMsg] = useState('Verifica in corso…');

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) { setMsg(error.message); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMsg('Nessun utente in sessione'); return; }

        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        let role: 'owner' | 'trainer' | 'member' = (prof?.role as any) ?? 'member';
        if (!prof?.role) {
          await supabase.from('profiles').update({ role: 'member' }).eq('id', user.id);
          role = 'member';
        }

        const next = search.get('next');
        router.replace(next || routeForRole(role));
      } catch (e: any) {
        setMsg(e?.message || 'Errore di conferma');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <div className={card}>{msg}</div>
    </div>
  );
}

export default function ConfirmClient() {
  // Boundary richiesto quando si usa useSearchParams in un client component
  return (
    <Suspense fallback={<div className={`max-w-md mx-auto ${card}`}>Verifica in corso…</div>}>
      <Inner />
    </Suspense>
  );
}
