'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, select } from '@/components/ui';

type ExerciseOpt = { id: string; name: string | null };
type SetRow = {
  created_at: string;
  load: number | null;
  reps: number | null;
  rpe: number | null;
};

export default function ProgressPage() {
  const supabase = createClient();
  const { userId } = useProfile();

  const [exOptions, setExOptions] = useState<ExerciseOpt[]>([]);
  const [selectedEx, setSelectedEx] = useState<string>('');
  const [rows, setRows] = useState<SetRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 1) Elenco esercizi con almeno un set dell'utente (senza embed)
  const loadExercises = async () => {
    if (!userId) return;
    setMsg(null);

    // Prendo exercise_id distinti dalla view normalizzata
    const { data: idsData, error: idsErr } = await supabase
      .from('user_sets_view')
      .select('exercise_id')
      .eq('user_id', userId)
      .not('exercise_id', 'is', null)
      .limit(2000);

    if (idsErr) { setMsg(idsErr.message); return; }

    const ids = Array.from(
      new Set((idsData ?? []).map((r: any) => r.exercise_id).filter(Boolean))
    ) as string[];

    if (ids.length === 0) {
      setExOptions([]);
      setSelectedEx('');
      return;
    }

    // Recupero i nomi dalla tabella exercises
    const { data: exData, error: exErr } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', ids);

    if (exErr) { setMsg(exErr.message); return; }

    const opts = (exData ?? [])
      .map((e: any) => ({ id: e.id as string, name: (e.name ?? null) as string | null }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    setExOptions(opts);
    if (!selectedEx && opts.length) setSelectedEx(opts[0].id);
    if (selectedEx && !ids.includes(selectedEx)) setSelectedEx(opts[0]?.id ?? '');
  };

  // 2) Set per l'esercizio scelto
  const loadSets = async () => {
    if (!userId || !selectedEx) { setRows([]); return; }
    setBusy(true); setMsg(null);

    const { data, error } = await supabase
      .from('user_sets_view')
      .select('created_at, load, reps, rpe')
      .eq('user_id', userId)
      .eq('exercise_id', selectedEx)
      .order('created_at', { ascending: true });

    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as SetRow[]);
    }
    setBusy(false);
  };

  useEffect(() => { loadExercises(); /* eslint-disable-line */ }, [userId]);
  useEffect(() => { loadSets(); /* eslint-disable-line */ }, [selectedEx, userId]);

  const hasData = rows.length > 0;

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Progressi</h1>
        <p className="text-sm opacity-80">Storico dei set registrati (Kg/Reps/RPE) per esercizio.</p>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      <div className={card}>
        <label className="flex flex-col gap-1 max-w-md">
          <span className="text-xs opacity-70">Esercizio</span>
          <select
            className={select}
            value={selectedEx}
            onChange={(e) => setSelectedEx(e.target.value)}
          >
            {exOptions.length === 0 && <option value="">— Nessun esercizio con set —</option>}
            {exOptions.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name ?? 'Senza nome'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={card}>
        <h2 className="text-base font-semibold mb-2">
          {exOptions.find((x) => x.id === selectedEx)?.name ?? 'Nessun esercizio'}
        </h2>

        {!hasData && (
          <p className="text-sm opacity-70">Nessun set trovato per l&apos;esercizio selezionato.</p>
        )}

        {hasData && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-neutral-700">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Kg</th>
                  <th className="py-2 pr-3">Reps</th>
                  <th className="py-2">RPE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-b border-neutral-800">
                    <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r.load ?? '—'}</td>
                    <td className="py-2 pr-3">{r.reps ?? '—'}</td>
                    <td className="py-2">{r.rpe ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
