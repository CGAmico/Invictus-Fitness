'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, btnPrimary, btnGhost } from '@/components/ui';

type Machine = { id: string; name: string; number: number; location: string | null };

export default function MachinesPage() {
  const supabase = createClient();
  const { isOwner, isTrainer } = useProfile();

  const [rows, setRows] = useState<Machine[]>([]);
  const [name, setName] = useState('');
  const [number, setNumber] = useState<number>(1);
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const canEdit = isOwner || isTrainer;

  const load = async () => {
    const { data } = await supabase
      .from('machines')
      .select('id, name, number, location')
      .order('name', { ascending: true })
      .order('number', { ascending: true });
    setRows((data ?? []) as Machine[]);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('machines').insert({
      name: name.trim(),
      number,
      location: location.trim() || null,
    });
    if (error) alert(error.message);
    setBusy(false);
    setName(''); setNumber(1); setLocation('');
    await load();
  };

  const del = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Eliminare questo macchinario?')) return;
    const { error } = await supabase.from('machines').delete().eq('id', id);
    if (error) alert(error.message);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Macchinari</h1>
        <p className="text-sm opacity-80">Gestisci elenco e numerazione degli attrezzi in sala.</p>
      </div>

      {canEdit && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Aggiungi macchinario</h2>
          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Nome</span>
              <input className={input} value={name} onChange={(e)=>setName(e.target.value)} placeholder="Es: Chest Press" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Numero</span>
              <input className={input} type="number" min={1} value={number} onChange={(e)=>setNumber(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Location (opz.)</span>
              <input className={input} value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Sala A / PT / …" />
            </label>
            <div className="flex items-end">
              <button className={btnPrimary + ' w-full'} disabled={busy}>
                {busy ? 'Salvo…' : 'Aggiungi'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={card}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map(m => (
            <div key={m.id} className="border border-neutral-700 rounded px-3 py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name} <span className="opacity-70">#{m.number}</span></div>
                {m.location && <div className="text-xs opacity-70">Location: {m.location}</div>}
              </div>
              {canEdit && (
                <button className={btnGhost} onClick={()=>del(m.id)}>Elimina</button>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm opacity-70">Nessun macchinario inserito.</p>}
        </div>
      </div>
    </div>
  );
}
