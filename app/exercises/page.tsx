'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../../lib/supabaseClient';
import { useProfile } from '../../lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '../../components/ui';

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string | null;
  unit: 'kg' | 'lb' | 'bodyweight';
  notes: string | null;
  video_url: string | null;
  created_at?: string | null;
};

const GROUPS = [
  '', 'Petto', 'Dorso', 'Spalle', 'Gambe', 'Glutei', 'Bicipiti', 'Tricipiti', 'Core', 'Full body', 'Altro',
];

const UNITS: Array<ExerciseRow['unit']> = ['kg', 'lb', 'bodyweight'];

const isValidUrl = (u: string) => {
  try { new URL(u); return true; } catch { return false; }
};

export default function ExercisesPage() {
  const supabase = createClient();
  const { isOwner, isTrainer } = useProfile();

  const canEdit = isOwner || isTrainer;

  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState('');

  // form: nuovo esercizio
  const [nName, setNName] = useState('');
  const [nGroup, setNGroup] = useState('');
  const [nUnit, setNUnit] = useState<ExerciseRow['unit']>('kg');
  const [nNotes, setNNotes] = useState('');
  const [nVideo, setNVideo] = useState('');

  // editing per-riga (id -> stato)
  const [edit, setEdit] = useState<Record<string, ExerciseRow>>({});

  const load = async () => {
    setMsg(null);
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, unit, notes, video_url, created_at')
      .order('name', { ascending: true });
    if (error) { setMsg(error.message); return; }
    setRows((data ?? []) as ExerciseRow[]);
    setEdit({});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const createEx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!nName.trim()) { setMsg('Inserisci un nome esercizio.'); return; }
    if (nVideo && !isValidUrl(nVideo)) { setMsg('Video URL non valido.'); return; }

    setBusy(true); setMsg(null);
    const payload: Partial<ExerciseRow> = {
      name: nName.trim(),
      muscle_group: nGroup || null,
      unit: nUnit,
      notes: nNotes.trim() || null,
      video_url: nVideo.trim() ? nVideo.trim() : null,
    };
    const { error } = await supabase.from('exercises').insert(payload);
    if (error) setMsg(error.message);
    setBusy(false);
    setNName(''); setNGroup(''); setNUnit('kg'); setNNotes(''); setNVideo('');
    await load();
  };

  const startEdit = (row: ExerciseRow) => {
    if (!canEdit) return;
    setEdit(prev => ({ ...prev, [row.id]: { ...row } }));
  };

  const cancelEdit = (id: string) => {
    setEdit(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const updateField = (id: string, key: keyof ExerciseRow, val: any) => {
    setEdit(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  };

  const save = async (id: string) => {
    if (!canEdit) return;
    const row = edit[id];
    if (!row) return;
    if (!row.name.trim()) { setMsg('Il nome è obbligatorio.'); return; }
    if (row.video_url && !isValidUrl(row.video_url)) { setMsg('Video URL non valido.'); return; }

    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('exercises')
      .update({
        name: row.name.trim(),
        muscle_group: row.muscle_group || null,
        unit: row.unit,
        notes: row.notes?.trim() || null,
        video_url: row.video_url?.trim() || null,
      })
      .eq('id', id);
    if (error) setMsg(error.message);
    setBusy(false);
    cancelEdit(id);
    await load();
  };

  const del = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Eliminare questo esercizio?')) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(qq) ||
      (r.muscle_group ?? '').toLowerCase().includes(qq)
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Esercizi</h1>
        <p className="text-sm opacity-80">
          {canEdit ? 'Crea e modifica esercizi. Aggiungi il Video URL per la guida all’esecuzione.' : 'Consulta gli esercizi disponibili e apri i video se presenti.'}
        </p>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {/* Ricerca */}
      <div className={card}>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-70">Cerca</span>
          <input
            className={input}
            placeholder="Nome o gruppo muscolare…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
        </label>
      </div>

      {/* Creazione (solo owner/trainer) */}
      {canEdit && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Nuovo esercizio</h2>
          <form onSubmit={createEx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <label className="md:col-span-3 flex flex-col gap-1">
              <span className="text-xs opacity-70">Nome</span>
              <input className={input} value={nName} onChange={(e)=>setNName(e.target.value)} placeholder="Es: Panca piana" />
            </label>
            <label className="md:col-span-3 flex flex-col gap-1">
              <span className="text-xs opacity-70">Gruppo muscolare</span>
              <select className={select} value={nGroup} onChange={(e)=>setNGroup(e.target.value)}>
                {GROUPS.map(g => <option key={g} value={g}>{g || '—'}</option>)}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs opacity-70">Unità</span>
              <select className={select} value={nUnit} onChange={(e)=>setNUnit(e.target.value as ExerciseRow['unit'])}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="md:col-span-4 flex flex-col gap-1">
              <span className="text-xs opacity-70">Video URL (opz.)</span>
              <input className={input} value={nVideo} onChange={(e)=>setNVideo(e.target.value)} placeholder="https://youtu.be/..." />
            </label>
            <label className="md:col-span-12 flex flex-col gap-1">
              <span className="text-xs opacity-70">Note (opz.)</span>
              <input className={input} value={nNotes} onChange={(e)=>setNNotes(e.target.value)} placeholder="Varianti, indicazioni, sicurezza…" />
            </label>
            <div className="md:col-span-12">
              <button className={btnPrimary} disabled={busy}>
                {busy ? 'Creo…' : 'Crea esercizio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className={card}>
        <h2 className="text-base font-semibold mb-2">Elenco esercizi</h2>
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(r => {
            const e = edit[r.id];
            const inEdit = !!e;

            return (
              <div key={r.id} className="border border-neutral-700 rounded p-3 space-y-2">
                {/* Riga 1: Nome + Gruppo + Unità */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <label className="md:col-span-2 flex flex-col gap-1">
                    <span className="text-xs opacity-70">Nome</span>
                    {inEdit ? (
                      <input className={input} value={e.name} onChange={(ev)=>updateField(r.id,'name',ev.target.value)} />
                    ) : (
                      <div className="text-sm">{r.name}</div>
                    )}
                  </label>

                  <label className="md:col-span-2 flex flex-col gap-1">
                    <span className="text-xs opacity-70">Gruppo muscolare</span>
                    {inEdit ? (
                      <select className={select} value={e.muscle_group ?? ''} onChange={(ev)=>updateField(r.id,'muscle_group',ev.target.value || null)}>
                        {GROUPS.map(g => <option key={g} value={g}>{g || '—'}</option>)}
                      </select>
                    ) : (
                      <div className="text-sm">{r.muscle_group || '—'}</div>
                    )}
                  </label>

                  <label className="md:col-span-2 flex flex-col gap-1">
                    <span className="text-xs opacity-70">Unità</span>
                    {inEdit ? (
                      <select className={select} value={e.unit} onChange={(ev)=>updateField(r.id,'unit',ev.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <div className="text-sm">{r.unit}</div>
                    )}
                  </label>
                </div>

                {/* Riga 2: Video URL + Azioni Play */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <label className="md:col-span-4 flex flex-col gap-1">
                    <span className="text-xs opacity-70">Video URL</span>
                    {inEdit ? (
                      <input
                        className={input}
                        value={e.video_url ?? ''}
                        onChange={(ev)=>updateField(r.id,'video_url',ev.target.value || null)}
                        placeholder="https://youtu.be/... oppure URL .mp4 da Storage"
                      />
                    ) : (
                      r.video_url ? (
                        <a
                          href={r.video_url}
                          target="_blank"
                          className="text-sm underline break-all"
                        >
                          {r.video_url}
                        </a>
                      ) : (
                        <div className="text-sm opacity-60">—</div>
                      )
                    )}
                    {/* warning URL */}
                    {inEdit && e.video_url && !isValidUrl(e.video_url) && (
                      <div className="text-xs text-red-400">URL non valido</div>
                    )}
                  </label>

                  <div className="md:col-span-2 flex items-end gap-2">
                    {r.video_url && !inEdit && (
                      <a href={r.video_url} target="_blank" className={btnGhost}>▶︎ Apri video</a>
                    )}
                    {canEdit && !inEdit && (
                      <>
                        <button className={btnGhost} onClick={()=>startEdit(r)}>Modifica</button>
                        <button className={btnGhost} onClick={()=>del(r.id)}>Elimina</button>
                      </>
                    )}
                    {canEdit && inEdit && (
                      <>
                        <button className={btnPrimary} disabled={busy} onClick={()=>save(r.id)}>
                          {busy ? 'Salvo…' : 'Salva'}
                        </button>
                        <button className={btnGhost} onClick={()=>cancelEdit(r.id)}>Annulla</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Riga 3: Note */}
                <div className="grid grid-cols-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">Note</span>
                    {inEdit ? (
                      <input
                        className={input}
                        value={e.notes ?? ''}
                        onChange={(ev)=>updateField(r.id,'notes',ev.target.value || null)}
                        placeholder="Varianti, indicazioni, sicurezza…"
                      />
                    ) : (
                      <div className="text-sm">{r.notes || '—'}</div>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm opacity-70">Nessun esercizio trovato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
