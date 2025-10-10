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

  // target “pesi” (numerici per compatibilità)
  target_sets: number | null;
  target_reps: number | null;
  target_load: number | null;

  // target “pesi” TESTUALI (nuovi, priorità di visualizzazione)
  target_sets_text?: string | null;
  target_reps_text?: string | null;
  target_load_text?: string | null;

  rpe_target: number | null;

  // recupero (sec) opzionale
  rest_seconds?: number | null;

  // cardio flags/targets
  is_cardio: boolean;
  cardio_minutes: number | null;
  cardio_distance_km: number | null;
  cardio_intensity: string | null;

  machine_label: string | null;
};

type LastEntryWeights = {
  type: 'weights';
  load: number | null;
  reps: number | null;
  rpe: number | null;
  performed_at: string | null;
};

type LastEntryCardio = {
  type: 'cardio';
  minutes: number | null;
  distance_km: number | null;
  intensity: string | null;
  performed_at: string | null;
};

type LastEntry = LastEntryWeights | LastEntryCardio;

export default function TrainProgramPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const programId = params?.id as string;

  const { userId } = useProfile();

  const [useRpe, setUseRpe] = useState<boolean>(false);
  const [days, setDays] = useState<Day[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // inputs: per pesi (load/reps/rpe) o cardio (minutes/distance/intensity)
  const [inputs, setInputs] = useState<
    Record<
      string,
      {
        load?: number;
        reps?: number;
        rpe?: number;
        minutes?: number;
        distance_km?: number;
        intensity?: string;
      }
    >
  >({});

  const [lasts, setLasts] = useState<Record<string, LastEntry>>({});

  const loadInit = async () => {
    setMsg(null);

    // Programma: uso anche use_rpe
    const { data: prog, error: eprog } = await supabase
      .from('programs')
      .select('id, member_id, use_rpe')
      .eq('id', programId)
      .single();
    if (eprog || !prog) { setMsg(eprog?.message || 'Programma non disponibile.'); return; }

    setUseRpe(!!prog.use_rpe);

    // verifica assegnazione (solo lato UI)
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
        id, program_day_id, exercise_id,
        target_sets, target_reps, target_load,
        target_sets_text, target_reps_text, target_load_text,
        rpe_target, rest_seconds,
        is_cardio, cardio_minutes, cardio_distance_km, cardio_intensity,
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

        target_sets_text: row.target_sets_text ?? null,
        target_reps_text: row.target_reps_text ?? null,
        target_load_text: row.target_load_text ?? null,

        rpe_target: row.rpe_target ?? null,
        rest_seconds: row.rest_seconds ?? null,

        is_cardio: !!row.is_cardio,
        cardio_minutes: row.cardio_minutes ?? null,
        cardio_distance_km: row.cardio_distance_km ?? null,
        cardio_intensity: row.cardio_intensity ?? null,
        machine_label: machineLabel,
      };
    });
    setItems(mapped);

    // ultimi valori per exercise_id dell'utente (sia pesi che cardio)
    if (mapped.length && userId) {
      const exIds = Array.from(new Set(mapped.map(i => i.exercise_id)));
      const { data: lastRows } = await supabase
        .from('workout_sets')
        .select(
          'exercise_id, load, reps, rpe, cardio_minutes, cardio_distance_km, cardio_intensity'
        )
        .eq('user_id', userId)
        .in('exercise_id', exIds)
        .order('day_index', { ascending: false });

      const byEx: Record<string, LastEntry> = {};
      (lastRows ?? []).forEach((r: any) => {
        const key = r.exercise_id as string;
        if (!byEx[key]) {
          const isCardioRow =
            r.cardio_minutes != null ||
            r.cardio_distance_km != null ||
            (r.cardio_intensity ?? '') !== '';

          if (isCardioRow) {
            byEx[key] = {
              type: 'cardio',
              minutes: r.cardio_minutes ?? null,
              distance_km: r.cardio_distance_km ?? null,
              intensity: r.cardio_intensity ?? null,
              performed_at: r.day_index ?? null,
            };
          } else {
            byEx[key] = {
              type: 'weights',
              load: r.load ?? null,
              reps: r.reps ?? null,
              rpe:  r.rpe  ?? null,
              performed_at: r.day_index ?? null,
            };
          }
        }
      });
      setLasts(byEx);
    } else {
      setLasts({});
    }

    setInputs({});
  };

  useEffect(() => { loadInit(); /* eslint-disable-next-line */ }, [programId, userId]);
  useEffect(() => { if (selectedDay) loadDayItems(selectedDay); /* eslint-disable-next-line */ }, [selectedDay]);

  const setInputWeights = (exId: string, field: 'load'|'reps'|'rpe', value: number) => {
    setInputs(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));
  };
  const setInputCardio = (exId: string, field: 'minutes'|'distance_km'|'intensity', value: number|string) => {
    setInputs(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value as any } }));
  };

  const save = async (it: Item) => {
    if (!userId || !sessionId) return;
    const inp = inputs[it.exercise_id] || {};
    const nowIso = new Date().toISOString();

    const base = {
      user_id: userId,
      session_id: sessionId,
      program_id: programId,
      program_exercise_id: it.id,
      exercise_id: it.exercise_id,
      day_index: nowIso,
    };

    const payload = it.is_cardio
      ? {
          ...base,
          cardio_minutes: inp.minutes ?? null,
          cardio_distance_km: inp.distance_km ?? null,
          cardio_intensity: (inp.intensity ?? '') || null,
          load: null,
          reps: null,
          rpe:  null,
        }
      : {
          ...base,
          load: inp.load ?? null,
          reps: inp.reps ?? null,
          rpe:  inp.rpe  ?? null,
          cardio_minutes: null,
          cardio_distance_km: null,
          cardio_intensity: null,
        };

    setBusy(true); setMsg(null);
    const { error } = await supabase.from('workout_sets').insert(payload);
    if (error) setMsg(error.message);
    setBusy(false);

    // aggiorna hint “Ultimo”
    if (it.is_cardio) {
      setLasts(prev => ({
        ...prev,
        [it.exercise_id]: {
          type: 'cardio',
          minutes: payload.cardio_minutes,
          distance_km: payload.cardio_distance_km,
          intensity: payload.cardio_intensity,
          performed_at: nowIso,
        }
      }));
    } else {
      setLasts(prev => ({
        ...prev,
        [it.exercise_id]: {
          type: 'weights',
          load: payload.load,
          reps: payload.reps,
          rpe:  payload.rpe,
          performed_at: nowIso,
        }
      }));
    }
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

  // helpers di testo ----------------------------------------------------------
  const pref = (text?: string | null, num?: number | null) =>
    (text && text.trim()) ? text.trim() : (num != null ? String(num) : '—');

  const targetLine = (it: Item) => {
    if (it.is_cardio) {
      const parts: string[] = [];
      if (it.cardio_minutes != null && it.cardio_minutes !== 0) parts.push(`${it.cardio_minutes} min`);
      if (it.cardio_distance_km != null && Number(it.cardio_distance_km) !== 0) parts.push(`${it.cardio_distance_km} km`);
      if (it.cardio_intensity) parts.push(it.cardio_intensity);
      return `Cardio: ${parts.join(' • ') || '—'}`;
    }

    const sets = pref(it.target_sets_text, it.target_sets);
    const reps = pref(it.target_reps_text, it.target_reps);
    const loadTxt = (it.target_load_text && it.target_load_text.trim())
      ? it.target_load_text.trim()
      : (it.target_load != null ? `${it.target_load} kg` : '—');

    const rec = (it.rest_seconds != null) ? ` • Rec ${it.rest_seconds}s` : '';

    return `Target: ${sets}x${reps} • ${loadTxt}${
      useRpe ? ` • RPE ${it.rpe_target ?? '—'}` : ''}${rec}${it.machine_label ? ` • Macchina: ${it.machine_label}` : ''}`;
  };

  const lastLine = (last?: LastEntry) => {
    if (!last) return null;
    if (last.type === 'cardio') {
      return `Ultimo: ${last.minutes ?? '—'} min • ${last.distance_km ?? '—'} km${
        last.intensity ? ` • ${last.intensity}` : ''}${
        last.performed_at ? ` (${new Date(last.performed_at).toLocaleDateString()})` : ''}`;
    }
    return `Ultimo: ${last.load ?? '—'} kg × ${last.reps ?? '—'} • RPE ${last.rpe ?? '—'}${
      last.performed_at ? ` (${new Date(last.performed_at).toLocaleDateString()})` : ''}`;
  };

  // --------------------------------------------------------------------------

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
                    <div className="text-xs opacity-70">{targetLine(it)}</div>
                    {last && (
                      <div className="text-xs opacity-70 mt-1">
                        {lastLine(last)}
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

                {/* Input: pesi VS cardio */}
                {it.is_cardio ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">Minuti</span>
                      <input
                        className={input}
                        type="number" min={0}
                        value={val.minutes ?? ''}
                        onChange={(e)=>setInputCardio(it.exercise_id, 'minutes', Number(e.target.value))}
                        placeholder={String(it.cardio_minutes ?? '')}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">Distanza (km)</span>
                      <input
                        className={input}
                        type="number" step="0.1" min={0}
                        value={val.distance_km ?? ''}
                        onChange={(e)=>setInputCardio(it.exercise_id, 'distance_km', Number(e.target.value))}
                        placeholder={String(it.cardio_distance_km ?? '')}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">Intensità</span>
                      <input
                        className={input}
                        value={val.intensity ?? ''}
                        onChange={(e)=>setInputCardio(it.exercise_id, 'intensity', e.target.value)}
                        placeholder={it.cardio_intensity ?? 'Es: Z2 / Facile / Media'}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">Kg</span>
                      <input
                        className={input}
                        type="number" step="0.5"
                        value={val.load ?? ''}
                        onChange={(e)=>setInputWeights(it.exercise_id, 'load', Number(e.target.value))}
                        placeholder={
                          (it.target_load_text && it.target_load_text.trim())
                            ? it.target_load_text
                            : String(it.target_load ?? '')
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">Ripetizioni</span>
                      <input
                        className={input}
                        type="number" min={1}
                        value={val.reps ?? ''}
                        onChange={(e)=>setInputWeights(it.exercise_id, 'reps', Number(e.target.value))}
                        placeholder={
                          (it.target_reps_text && it.target_reps_text.trim())
                            ? it.target_reps_text
                            : String(it.target_reps ?? '')
                        }
                      />
                    </label>
                    {useRpe && (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">RPE</span>
                        <input
                          className={input}
                          type="number" step="0.5" min={5} max={10}
                          value={val.rpe ?? ''}
                          onChange={(e)=>setInputWeights(it.exercise_id, 'rpe', Number(e.target.value))}
                          placeholder={String(it.rpe_target ?? '')}
                        />
                      </label>
                    )}
                    {!useRpe && <div />} {/* per mantenere il grid 3-col se RPE è nascosto */}
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && <p className="text-sm opacity-70">Nessun esercizio in questo giorno.</p>}
        </div>
      </div>
    </div>
  );
}
