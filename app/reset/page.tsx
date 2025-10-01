'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { card, input, btnPrimary } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) return setMsg('Le password non coincidono.');
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg('Password aggiornata. Ora puoi accedere.');
    setTimeout(() => router.push('/login'), 1000);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className={card}>
        <h1 className="text-2xl font-bold mb-4">Imposta nuova password</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm opacity-80">Nuova password</label>
            <input
              type="password"
              className={input + ' w-full'}
              value={pass1}
              onChange={(e)=>setPass1(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm opacity-80">Conferma password</label>
            <input
              type="password"
              className={input + ' w-full'}
              value={pass2}
              onChange={(e)=>setPass2(e.target.value)}
              required
            />
          </div>
          <button disabled={busy} className={btnPrimary + ' w-full'}>
            {busy ? 'Attendere…' : 'Aggiorna password'}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm opacity-90">{msg}</p>}
      </div>
    </div>
  );
}
