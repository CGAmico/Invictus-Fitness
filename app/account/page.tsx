'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabaseClient';
import { useProfile } from '../../lib/useProfile';
import { card, input, btnPrimary, btnGhost, select } from '../../components/ui';

export default function AccountPage() {
  const supabase = createClient();
  const { userId, loading } = useProfile();

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    if (!loading && userId) {
      supabase.from('profiles')
        .select('full_name, gender, birth_date, height_cm, weight_kg')
        .eq('id', userId).single()
        .then(({ data }) => {
          if (!data) return;
          setFullName(data.full_name ?? '');
          setGender((data.gender ?? '') as any);
          setBirthDate(data.birth_date ?? '');
          setHeightCm(data.height_cm ?? '');
          setWeightKg(data.weight_kg ?? '');
        });
    }
  }, [loading, userId, supabase]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName || null,
      gender: gender || null,
      birth_date: birthDate || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
    }).eq('id', userId);
    setBusy(false);
    setMsg(error ? error.message : 'Profilo aggiornato ✅');
  };

  if (loading) return <div className={card}>Carico…</div>;
  if (!userId) return <div className={card}>Devi essere loggato.</div>;

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold mb-3">Profilo</h1>
        <p className="text-sm opacity-80">Aggiorna i tuoi dati personali.</p>
      </div>

      <div className={card}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-sm opacity-80">Nome e cognome</label>
            <input className={input + ' w-full'} value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm opacity-80">Sesso</label>
              <select className={select + ' w-full'} value={gender} onChange={(e)=>setGender(e.target.value as any)}>
                <option value="">—</option>
                <option value="male">Maschio</option>
                <option value="female">Femmina</option>
                <option value="other">Altro</option>
              </select>
            </div>
            <div>
              <label className="text-sm opacity-80">Data di nascita</label>
              <input type="date" className={input + ' w-full'} value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm opacity-80">Altezza (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" min="0" className={input + ' w-full'} value={heightCm} onChange={(e)=>setHeightCm(e.target.value)} />
            </div>
            <div>
              <label className="text-sm opacity-80">Peso (kg)</label>
              <input type="number" inputMode="decimal" step="0.1" min="0" className={input + ' w-full'} value={weightKg} onChange={(e)=>setWeightKg(e.target.value)} />
            </div>
          </div>

          <button className={btnPrimary}>{busy ? 'Salvataggio…' : 'Salva'}</button>
          {msg && <p className="text-sm opacity-80 mt-2">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
