'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { routeForRole } from '@/lib/redirectAfterLogin';
import { card } from '@/components/ui';

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createClient();
  const search = useSearchParams();
  const [msg, setMsg] = useState('Verifica in corso…');

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase restituisce i params in hash o query a seconda del client/email
        // exchangeCodeForSession gestisce entrambi i casi
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) { setMsg(error.message); return; }

        // prendi ruolo e reindirizza
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMsg('Nessun utente in sessione'); return; }

        let role: 'owner' | 'trainer' | 'member' | null = null;
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        role = (prof?.role as any) ?? 'member';

        // Se manca, imposta member
        if (!prof?.role) {
          await supabase.from('profiles').update({ role: 'member' }).eq('id', user.id);
          role = 'member';
        }

        router.replace(routeForRole(role));
      } catch (e: any) {
        setMsg(e?.message || 'Errore di conferma');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <div className={card}>{msg}</div>
    </div>
  );
}
