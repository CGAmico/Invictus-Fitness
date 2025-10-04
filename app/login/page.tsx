'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { card, input, select, btnPrimary, btnGhost } from '@/components/ui';
import { routeForRole } from '@/lib/redirectAfterLogin';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  // campi comuni
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // campi profilo per signup
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  useEffect(() => { setMsg(null); }, [mode]);

  // 🔁 Se UTENTE GIÀ LOGGATO, reindirizza via client
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = (prof?.role as 'owner'|'trainer'|'member') ?? 'member';
      router.replace(routeForRole(role));
    })();
  }, [router, supabase]);

  // upsert profilo (non imposta il role: lo mette il trigger lato DB)
  const upsertProfile = async (uid: string) => {
    await supabase.from('profiles').upsert({
      id: uid,
      email,
      full_name: fullName || null,
      gender: gender || null,
      birth_date: birthDate || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
    });
  };

  // redirect in base al ruolo (fallback a 'member')
  const redirectByRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { router.replace('/login'); return; }

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (prof?.role as 'owner'|'trainer'|'member') ?? 'member';
    router.replace(routeForRole(role));
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    await redirectByRole();
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);

    const site = process.env.NEXT_PUBLIC_SITE_URL || location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${site}/login/confirm`,
        data: { full_name: fullName || undefined },
      },
    });

    if (error) {
      setBusy(false);
      return setMsg(error.message);
    }

    const uid = data.user?.id;
    if (uid) {
      await upsertProfile(uid);
      setBusy(false);
      setMsg('Registrazione completata! Ora puoi accedere.');
      setMode('login');
      return;
    }

    setBusy(false);
    setMsg('Registrazione avviata. Controlla la tua email per confermare, poi accedi con email e password.');
    setMode('login');
  };

  const onMagicLink = async () => {
    if (!email) return setMsg('Inserisci la tua email prima.');
    setBusy(true); setMsg(null);

    const site = process.env.NEXT_PUBLIC_SITE_URL || location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site}/login/confirm` },
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg('Ti abbiamo inviato un link di accesso. Controlla la posta!');
  };

  const onReset = async () => {
    if (!email) return setMsg('Inserisci la tua email per il reset.');
    setBusy(true); setMsg(null);

    const site = process.env.NEXT_PUBLIC_SITE_URL || location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/reset`,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg('Email di reset inviata. Controlla la posta e segui il link.');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className={card}>
        <h1 className="text-2xl font-bold mb-4">
          {mode === 'login' ? 'Accedi' : 'Crea un account'}
        </h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('login')}
            className={mode==='login' ? btnPrimary : btnGhost}
          >Login</button>
          <button
            onClick={() => setMode('signup')}
            className={mode==='signup' ? btnPrimary : btnGhost}
          >Registrati</button>
        </div>

        {mode === 'signup' && (
          <form onSubmit={onSignup} className="space-y-3">
            <div>
              <label className="text-sm opacity-80">Nome e cognome</label>
              <input
                className={input + ' w-full'}
                value={fullName}
                onChange={(e)=>setFullName(e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm opacity-80">Sesso</label>
                <select
                  className={select + ' w-full'}
                  value={gender}
                  onChange={(e)=>setGender(e.target.value as any)}
                >
                  <option value="">—</option>
                  <option value="male">Maschio</option>
                  <option value="female">Femmina</option>
                  <option value="other">Altro</option>
                </select>
              </div>
              <div>
                <label className="text-sm opacity-80">Data di nascita</label>
                <input
                  type="date"
                  className={input + ' w-full'}
                  value={birthDate}
                  onChange={(e)=>setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm opacity-80">Altezza (cm)</label>
                <input
                  type="number" inputMode="decimal" step="0.1" min="0"
                  className={input + ' w-full'}
                  value={heightCm}
                  onChange={(e)=>setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div>
                <label className="text-sm opacity-80">Peso (kg)</label>
                <input
                  type="number" inputMode="decimal" step="0.1" min="0"
                  className={input + ' w-full'}
                  value={weightKg}
                  onChange={(e)=>setWeightKg(e.target.value)}
                  placeholder="72.5"
                />
              </div>
            </div>

            <div>
              <label className="text-sm opacity-80">Email</label>
              <input
                type="email"
                className={input + ' w-full'}
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm opacity-80">Password</label>
              <input
                type="password"
                className={input + ' w-full'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>

            <button disabled={busy} className={btnPrimary + ' w-full'}>
              {busy ? 'Attendere…' : 'Registrati'}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={onLogin} className="space-y-3">
            <div>
              <label className="text-sm opacity-80">Email</label>
              <input
                type="email"
                className={input + ' w-full'}
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm opacity-80">Password</label>
              <input
                type="password"
                className={input + ' w-full'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>
            <button disabled={busy} className={btnPrimary + ' w-full'}>
              {busy ? 'Attendere…' : 'Accedi'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          <button onClick={onMagicLink} className={btnGhost + ' w-full'}>
            ✉️ Invia magic link a questa email
          </button>
          <button onClick={onReset} className={btnGhost + ' w-full'}>
            🔑 Password dimenticata (reset)
          </button>
        </div>

        {msg && <p className="mt-3 text-sm opacity-90">{msg}</p>}
      </div>
    </div>
  );
}
