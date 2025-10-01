'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '@/components/ui';

type Day = { id: string; day_index: number; name: string | null };
type Item = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  exercise_name: string;
  target_sets: number | null;
  target_reps: number | null;
  target_load: number | null;
  rpe_target: number | null;
  machine_label: string | null;
};

type LastEntry = {
  load: number | null;
  reps: number | null;
  rpe: number | null;
  performed_at: string | null;
};

export default function TrainProgramPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const programId = params?.id as string;

  const { userId } = useProfile();

  const [days, setDays] = useState<Day[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [inputs, setInputs] = useState<Record<string, { load?: number; reps?: number; rpe?: number }>>({});
  const [lasts, setLasts] = useState<Record<string, LastEntry>>({});

  const loadInit = async () => {
    setMsg(null);

    // Programma (verifica assegnazione lato UI)
    const { data: prog } = await supabase
      .from('programs')
      .select('id, member_id')
      .eq('id', programId)
      .single();
    if (!prog) { setMsg('Programma non disponibile.'); return; }
    if (prog.member_id && userId && prog.member_id !== userId) {
      setMsg('Questo programma non è assegnato a te.'); return;
    }

    // Giorni
    const { data: d } = await supabase
      .from('program_days')
      .select('id, day_index, name')
      .eq('program_id', programId)
      .order('day_index', { ascending: true });
    const daysArr = (d ?? []) as Day[];
    setDays(daysArr);
    setSelectedDay(daysArr?.[0]?.id ?? '');

    // Sessione aperta (o creane una)
    if (userId) {
      const { data: open } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .is('ended_at', null)
        .limit(1)
        .maybeSingle();

      if (open?.id) setSessionId(open.id);
      else {
        const { data: created, error: es } = await supabase
          .from('workout_sessions')
          .insert({ user_id: userId, program_id: programId, started_at: new Date().toISOString() })
          .select('id')
          .single();
        if (!es) setSessionId(created?.id ?? null);
        else setMsg(es.message);
      }
    }
  };

  const loadDayItems = async (dayId: string) => {
    if (!dayId) { setItems([]); return; }
    const { data: pe } = await supabase
      .from('program_exercises')
      .select(`
        id, program_day_id, exercise_id, target_sets, target_reps, target_load, rpe_target,
        exercises ( name ),
        machines ( name, number, location )
      `)
      .eq('program_day_id', dayId)
      .order('order_index', { ascending: true });

    const mapped: Item[] = (pe ?? []).map((row: any) => {
      const m = row.machines as { name?: string; number?: number; location?: string | null } | null;
      const machineLabel = m ? `${m.name} #${m.number}${m.location ? ` (${m.location})` : ''}` : null;
      return {
        id: row.id,
        program_day_id: row.program_day_id,
        exercise_id: row.exercise_id,
        exercise_name: row.exercises?.name ?? '—',
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_load: row.target_load,
        rpe_target: row.rpe_target,
        machine_label: machineLabel,
      };
    });
    setItems(mapped);

    // ultimi valori per exercise_id dell'utente
    if (mapped.length && userId) {
      const exIds = Array.from(new Set(mapped.map(i => i.exercise_id)));
      const { data: lastRows } = await supabase
        .from('workout_sets')
        .select('exercise_id, load, reps, rpe, created_at')
        .eq('user_id', userId)
        .in('exercise_id', exIds)
        .order('created_at', { ascending: false });

      const byEx: Record<string, LastEntry> = {};
      (lastRows ?? []).forEach((r: any) => {
        const key = r.exercise_id as string;
        if (!byEx[key]) byEx[key] = {
          load: r.load ?? null,
          reps: r.reps ?? null,
          rpe:  r.rpe  ?? null,
          performed_at: r.created_at ?? null,
        };
      });
      setLasts(byEx);
    } else {
      setLasts({});
    }

    setInputs({});
  };

  useEffect(() => { loadInit(); /* eslint-disable-next-line */ }, [programId, userId]);
  useEffect(() => { if (selectedDay) loadDayItems(selectedDay); /* eslint-disable-next-line */ }, [selectedDay]);

  const setInput = (exId: string, field: 'load'|'reps'|'rpe', value: number) => {
    setInputs(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));
  };

  const save = async (it: Item) => {
    if (!userId || !sessionId) return;
    const inp = inputs[it.exercise_id] || {};
    const payload = {
      user_id: userId,
      session_id: sessionId,
      program_id: programId,            // 👈 salva anche il programma
      program_exercise_id: it.id,
      exercise_id: it.exercise_id,      // 👈 salva anche l’esercizio
      load: inp.load ?? null,
      reps: inp.reps ?? null,
      rpe:  inp.rpe  ?? null,
      created_at: new Date().toISOString(),
    };
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('workout_sets').insert(payload);
    if (error) setMsg(error.message);
    setBusy(false);

    // aggiorna hint
    setLasts(prev => ({
      ...prev,
      [it.exercise_id]: {
        load: payload.load,
        reps: payload.reps,
        rpe:  payload.rpe,
        performed_at: payload.created_at,
      }
    }));
  };

  const endSession = async () => {
    if (!sessionId) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('workout_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) setMsg(error.message);
    setBusy(false);
  };

  const currentDay = useMemo(() => days.find(d => d.id === selectedDay) ?? null, [days, selectedDay]);

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Allenamento</h1>
            <p className="text-sm opacity-80">
              Programma assegnato • Sessione: {sessionId ? sessionId.slice(0,8) : '…'}
            </p>
          </div>
          <div className="flex gap-2">
            <a className={btnGhost} href={`/programs/${programId}`}>Torna al programma</a>
            <button className={btnGhost} onClick={endSession} disabled={!sessionId || busy}>
              Termina sessione
            </button>
          </div>
        </div>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      <div className={card}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-70">Giorno</span>
            <select className={select} value={selectedDay} onChange={(e)=>setSelectedDay(e.target.value)}>
              {days.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name ?? `Giorno ${d.day_index}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-base font-semibold mb-2">
          {currentDay ? (currentDay.name ?? `Giorno ${currentDay.day_index}`) : 'Giorno'}
        </h2>

        <div className="space-y-2">
          {items.map(it => {
            const last = lasts[it.exercise_id];
            const val = inputs[it.exercise_id] || {};
            return (
              <div key={it.id} className="border border-neutral-700 rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{it.exercise_name}</div>
                    <div className="text-xs opacity-70">
                      Target: {it.target_sets ?? '—'}x{it.target_reps ?? '—'} • {it.target_load ?? 0} kg • RPE {it.rpe_target ?? '—'}
                      {it.machine_label ? ` • Macchina: ${it.machine_label}` : ''}
                    </div>
                    {last && (
                      <div className="text-xs opacity-70 mt-1">
                        Ultimo: {last.load ?? '—'} kg × {last.reps ?? '—'} • RPE {last.rpe ?? '—'}
                        {last.performed_at ? ` (${new Date(last.performed_at).toLocaleDateString()})` : ''}
                      </div>
                    )}
                  </div>
                  <button
                    className={btnPrimary}
                    onClick={() => save(it)}
                    disabled={busy}
                    title="Salva il set inserito"
                  >
                    Salva
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">Kg</span>
                    <input
                      className={input}
                      type="number" step="0.5"
                      value={val.load ?? ''}
                      onChange={(e)=>setInput(it.exercise_id, 'load', Number(e.target.value))}
                      placeholder={last?.load != null ? String(last.load) : '—'}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">Ripetizioni</span>
                    <input
                      className={input}
                      type="number" min={1}
                      value={val.reps ?? ''}
                      onChange={(e)=>setInput(it.exercise_id, 'reps', Number(e.target.value))}
                      placeholder={last?.reps != null ? String(last.reps) : '—'}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">RPE</span>
                    <input
                      className={input}
                      type="number" step="0.5" min={5} max={10}
                      value={val.rpe ?? ''}
                      onChange={(e)=>setInput(it.exercise_id, 'rpe', Number(e.target.value))}
                      placeholder={last?.rpe != null ? String(last.rpe) : '—'}
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {items.length === 0 && <p className="text-sm opacity-70">Nessun esercizio in questo giorno.</p>}
        </div>
      </div>
    </div>
  );
}
