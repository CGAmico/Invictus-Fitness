'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '@/components/ui';
import VideoModal from './VideoModal';

type Program = {
  id: string;
  name: string;
  owner_id: string | null;
  member_id: string | null;
  start_date: string | null;
  end_date: string | null;
  use_rpe: boolean;
};

type Day = {
  id: string;
  program_id: string;
  day_index: number;
  name: string | null;
};

type ProgramExercise = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  order_index: number | null;
  target_sets: number | null;
  target_reps: number | null;
  target_load: number | null;
  rpe_target: number | null;
  notes: string | null;
  exercise_name?: string;
  machine_id?: string | null;
  machine_label?: string | null;
  method?: string | null;
  method_details?: string | null;
  video_url?: string | null;

  // Cardio
  is_cardio: boolean;
  cardio_minutes: number | null;
  cardio_distance_km: number | null;
  cardio_intensity: string | null;
};

type Exercise = { id: string; name: string };
type Machine  = { id: string; name: string; number: number; location: string | null };

export default function ProgramDetailPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const programId = params?.id as string;

  const { isOwner, isTrainer, userId } = useProfile();

  const [program, setProgram] = useState<Program | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [exs, setExs] = useState<ProgramExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form: nuovo giorno
  const [dayName, setDayName]   = useState('');
  const [dayIndex, setDayIndex] = useState<number>(1);

  // form: aggiungi esercizio (libero o esistente)
  const [selDay, setSelDay]         = useState<string>('');
  const [exerciseName, setExerciseName] = useState('');

  // forza (string per permettere vuoto)
  const [sets, setSets] = useState<string>(''); // facoltativo
  const [reps, setReps] = useState<string>(''); // facoltativo
  const [load, setLoad] = useState<string>(''); // facoltativo
  const [rpe,  setRpe]  = useState<string>(''); // facoltativo

  const [selMachine, setSelMachine]     = useState<string>('');
  const [method, setMethod]             = useState<string>('');
  const [methodDetails, setMethodDetails] = useState<string>('');

  // cardio
  const [isCardio, setIsCardio]             = useState<boolean>(false);
  const [cardioMinutes, setCardioMinutes]   = useState<string>('');
  const [cardioDistanceKm, setCardioDistanceKm] = useState<string>('');
  const [cardioIntensity, setCardioIntensity]   = useState<string>('');

  // video modal
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const canEdit = !!program && (isOwner || (isTrainer && program.owner_id === userId));
  const isAssignedToYou = !!program && program.member_id === userId && !canEdit;

  const loadAll = async () => {
    setMsg(null);

    // Programma
    const { data: p, error: ep } = await supabase
      .from('programs')
      .select('id, name, owner_id, member_id, start_date, end_date, use_rpe')
      .eq('id', programId)
      .single();
    if (ep) { setMsg(ep.message); return; }
    setProgram(p as Program);

    // Autore
    if (p?.owner_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', p.owner_id)
        .single();
      setAuthorName(prof?.full_name || prof?.email || null);
    } else {
      setAuthorName(null);
    }

    // Giorni
    const { data: d, error: ed } = await supabase
      .from('program_days')
      .select('id, program_id, day_index, name')
      .eq('program_id', programId)
      .order('day_index', { ascending: true });
    if (ed) { setMsg(ed.message); return; }
    setDays((d ?? []) as Day[]);
    setSelDay((d?.[0]?.id) ?? '');

    // Lista esercizi (per find-or-create)
    const { data: lex } = await supabase
      .from('exercises')
      .select('id, name')
      .order('name', { ascending: true });
    setAllExercises((lex ?? []) as Exercise[]);

    // Macchine
    const { data: mach } = await supabase
      .from('machines')
      .select('id, name, number, location')
      .order('name', { ascending: true })
      .order('number', { ascending: true });
    setMachines((mach ?? []) as Machine[]);

    // Esercizi del programma (join con exercises.video_url e machines)
    const dayIds   = (d ?? []).map(x => x.id);
    const idsForIn = dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000'];

    const { data: pe, error: ee } = await supabase
      .from('program_exercises')
      .select(`
        id, program_day_id, exercise_id, order_index, target_sets, target_reps, target_load, rpe_target, notes,
        method, method_details, machine_id,
        is_cardio, cardio_minutes, cardio_distance_km, cardio_intensity,
        exercises ( name, video_url ),
        machines ( name, number, location )
      `)
      .in('program_day_id', idsForIn)
      .order('order_index', { ascending: true });

    if (ee) { setMsg(ee.message); return; }

    const mapped = (pe ?? []).map(row => {
      const ex = (row as any).exercises as { name?: string; video_url?: string | null } | null;
      const exName = ex?.name ?? '—';
      const m = (row as any).machines as { name?: string; number?: number; location?: string | null } | null;
      const machineLabel = m ? `${m.name} #${m.number}${m.location ? ` (${m.location})` : ''}` : null;

      return {
        id: row.id,
        program_day_id: row.program_day_id,
        exercise_id: row.exercise_id,
        order_index: row.order_index,
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_load: row.target_load,
        rpe_target: row.rpe_target,
        notes: row.notes,
        method: (row as any).method ?? null,
        method_details: (row as any).method_details ?? null,
        machine_id: (row as any).machine_id ?? null,
        exercise_name: exName,
        machine_label: machineLabel,
        video_url: ex?.video_url ?? null,

        is_cardio: (row as any).is_cardio ?? false,
        cardio_minutes: (row as any).cardio_minutes ?? null,
        cardio_distance_km: (row as any).cardio_distance_km ?? null,
        cardio_intensity: (row as any).cardio_intensity ?? null,
      } as ProgramExercise;
    });

    setExs(mapped);
  };

  useEffect(() => {
    if (programId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const createDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('program_days')
      .insert({ program_id: programId, day_index: dayIndex, name: dayName || null });
    if (error) setMsg(error.message);
    setBusy(false);
    setDayName('');
    setDayIndex((prev) => prev + 1);
    await loadAll();
  };

  // trova o crea esercizio per nome
  const ensureExerciseId = async (nameRaw: string): Promise<string | null> => {
    const name = nameRaw.trim();
    if (!name) return null;

    const found = allExercises.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (found) return found.id;

    const { data, error } = await supabase
      .from('exercises')
      .insert({ name, unit: 'kg' })
      .select('id')
      .single();
    if (error) { setMsg(error.message); return null; }

    if (data?.id) {
      setAllExercises(prev => [...prev, { id: data.id, name }]);
      return data.id as string;
    }
    return null;
  };

  // helper per numeri facoltativi
  const toNumOrNull = (s: string) => (s.trim() === '' ? null : Number(s));

  const addExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selDay) return;
    setBusy(true); setMsg(null);

    const exercise_id = await ensureExerciseId(exerciseName);
    if (!exercise_id) { setBusy(false); return; }

    const insertPayload: any = {
      program_day_id: selDay,
      exercise_id,
      order_index: (exs.filter(x => x.program_day_id === selDay).length) + 1,
      method: method || null,
      method_details: methodDetails || null,
    };

    if (isCardio) {
      insertPayload.is_cardio          = true;
      insertPayload.cardio_minutes     = toNumOrNull(cardioMinutes);
      insertPayload.cardio_distance_km = toNumOrNull(cardioDistanceKm);
      insertPayload.cardio_intensity   = cardioIntensity.trim() || null;

      insertPayload.target_sets  = null;
      insertPayload.target_reps  = null;
      insertPayload.target_load  = null;
      insertPayload.rpe_target   = null;
    } else {
      insertPayload.is_cardio     = false;
      insertPayload.target_sets   = toNumOrNull(sets);
      insertPayload.target_reps   = toNumOrNull(reps);
      insertPayload.target_load   = toNumOrNull(load);
      insertPayload.rpe_target    = program?.use_rpe ? toNumOrNull(rpe) : null;

      insertPayload.cardio_minutes     = null;
      insertPayload.cardio_distance_km = null;
      insertPayload.cardio_intensity   = null;
    }

    if (selMachine) insertPayload.machine_id = selMachine;

    const { error } = await supabase.from('program_exercises').insert(insertPayload);
    if (error) setMsg(error.message);

    setBusy(false);

    // reset form
    setExerciseName('');
    setSelMachine('');
    setMethod(''); setMethodDetails('');
    setSets(''); setReps(''); setLoad(''); setRpe('');
    setIsCardio(false); setCardioMinutes(''); setCardioDistanceKm(''); setCardioIntensity('');

    await loadAll();
  };

  const deleteDay = async (dayId: string) => {
    if (!canEdit) return;
    if (!confirm('Eliminare questo giorno e gli esercizi collegati?')) return;
    setBusy(true);
    const { error } = await supabase.from('program_days').delete().eq('id', dayId);
    if (error) alert(error.message);
    setBusy(false);
    await loadAll();
  };

  const deleteItem = async (id: string) => {
    if (!canEdit) return;
    setBusy(true);
    const { error } = await supabase.from('program_exercises').delete().eq('id', id);
    if (error) alert(error.message);
    setBusy(false);
    await loadAll();
  };

  const exByDay = useMemo(() => {
    const map: Record<string, ProgramExercise[]> = {};
    for (const e of exs) {
      if (!map[e.program_day_id]) map[e.program_day_id] = [];
      map[e.program_day_id].push(e);
    }
    return map;
  }, [exs]);

  if (!program) {
    return <div className={card}>Carico…</div>;
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <p className="text-sm opacity-80">
              Inizio: {program.start_date ?? '—'}
              {program.end_date ? ` • Fine: ${program.end_date}` : ''}
              {authorName ? ` • Autore: ${authorName}` : ''}
              {program.use_rpe ? ' • RPE attivo' : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <a href={`/programs/${programId}/print`} className={btnGhost}>Stampa / PDF</a>
            {(!isOwner && !isTrainer && program.member_id === userId) && (
              <a href={`/programs/${programId}/train`} className={btnPrimary}>Allenati</a>
            )}
          </div>
        </div>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {/* EDITOR (solo owner o trainer proprietario) */}
      {canEdit && (
        <>
          <div className={card}>
            <h2 className="text-lg font-semibold mb-3">Crea Giorno</h2>
            <form onSubmit={createDay} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs opacity-70">Nome Giorno (opzionale)</span>
                <input
                  className={input}
                  placeholder="Es: Giorno 1, Spinta…"
                  value={dayName}
                  onChange={(e)=>setDayName(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs opacity-70">Indice</span>
                <input
                  className={input}
                  type="number" min={1}
                  placeholder="1"
                  value={dayIndex}
                  onChange={(e)=>setDayIndex(Number(e.target.value))}
                />
              </label>

              <div className="flex items-end">
                <button className={btnPrimary + ' w-full'} disabled={busy}>
                  {busy ? 'Attendere…' : 'Aggiungi Giorno'}
                </button>
              </div>
            </form>
          </div>

          {days.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold mb-3">Aggiungi esercizio</h2>
              <form onSubmit={addExercise} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs opacity-70">Giorno</span>
                  <select
                    className={select}
                    value={selDay}
                    onChange={(e)=>setSelDay(e.target.value)}
                  >
                    <option value="">Seleziona…</option>
                    {days.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name ?? `Giorno ${d.day_index}`}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Nome esercizio (nuovo o esistente) */}
                <label className="md:col-span-4 flex flex-col gap-1">
                  <span className="text-xs opacity-70">Nome esercizio (nuovo o esistente)</span>
                  <input
                    className={input}
                    placeholder="Es: Panca piana / Tapis Roulant"
                    value={exerciseName}
                    onChange={(e)=>setExerciseName(e.target.value)}
                  />
                </label>

                {/* Toggle Cardio */}
                <div className="md:col-span-2 flex items-end">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCardio}
                      onChange={(e)=>setIsCardio(e.target.checked)}
                    />
                    <span className="text-sm">Cardio</span>
                  </label>
                </div>

                {/* Blocchi dinamici */}
                {isCardio ? (
                  <>
                    <label className="md:col-span-2 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Durata (min)</span>
                      <input
                        className={input}
                        type="number" min={0}
                        value={cardioMinutes}
                        onChange={(e)=>setCardioMinutes(e.target.value)}
                        placeholder="—"
                      />
                    </label>
                    <label className="md:col-span-2 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Distanza (km)</span>
                      <input
                        className={input}
                        type="number" min={0} step="0.01"
                        value={cardioDistanceKm}
                        onChange={(e)=>setCardioDistanceKm(e.target.value)}
                        placeholder="—"
                      />
                    </label>
                    <label className="md:col-span-4 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Intensità / Vel / FC (opz.)</span>
                      <input
                        className={input}
                        placeholder="Es: Vel 7.0 / FC 140-150"
                        value={cardioIntensity}
                        onChange={(e)=>setCardioIntensity(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="md:col-span-1 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Serie</span>
                      <input
                        className={input}
                        type="number" min={0}
                        value={sets}
                        onChange={(e)=>setSets(e.target.value)}
                        placeholder="—"
                      />
                    </label>

                    <label className="md:col-span-1 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Ripetizioni</span>
                      <input
                        className={input}
                        type="number" min={0}
                        value={reps}
                        onChange={(e)=>setReps(e.target.value)}
                        placeholder="—"
                      />
                    </label>

                    <label className="md:col-span-1 flex flex-col gap-1">
                      <span className="text-xs opacity-70">Kg</span>
                      <input
                        className={input}
                        type="number" step="0.5" min={0}
                        value={load}
                        onChange={(e)=>setLoad(e.target.value)}
                        placeholder="—"
                      />
                    </label>

                    {program.use_rpe && (
                      <label className="md:col-span-1 flex flex-col gap-1">
                        <span className="text-xs opacity-70">RPE</span>
                        <input
                          className={input}
                          type="number" step="0.5" min={1} max={10}
                          value={rpe}
                          onChange={(e)=>setRpe(e.target.value)}
                          placeholder="—"
                        />
                      </label>
                    )}
                  </>
                )}

                {/* Metodo */}
                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs opacity-70">Metodo (opz.)</span>
                  <input
                    className={input}
                    placeholder="Superset, Dropset, Rest-Pause…"
                    value={method}
                    onChange={(e)=>setMethod(e.target.value)}
                  />
                </label>

                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs opacity-70">Dettagli metodo (opz.)</span>
                  <input
                    className={input}
                    placeholder="Esempio: con croci / 7-7-7 / scala 70-50-30%"
                    value={methodDetails}
                    onChange={(e)=>setMethodDetails(e.target.value)}
                  />
                </label>

                {/* Macchinario (opz.) */}
                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs opacity-70">Macchinario (opz.)</span>
                  <select
                    className={select}
                    value={selMachine}
                    onChange={(e)=>setSelMachine(e.target.value)}
                  >
                    <option value="">— Nessuna macchina —</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} #{m.number}{m.location ? ` (${m.location})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-12 flex items-end">
                  <button className={btnPrimary} disabled={busy}>
                    {busy ? 'Aggiungo…' : 'Aggiungi esercizio'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* LISTA GIORNI + ESERCIZI */}
      <div className="space-y-3">
        {days.map(d => (
          <div key={d.id} className={card + ' avoid-break'}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {d.name ?? `Giorno ${d.day_index}`}
              </h3>
              {canEdit && (
                <button className={btnGhost} onClick={()=>deleteDay(d.id)}>Elimina giorno</button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {(exByDay[d.id] ?? []).map(item => (
                <div key={item.id} className="flex items-center justify-between border border-neutral-700 rounded px-3 py-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{item.exercise_name ?? '—'}</span>
                      {item.video_url && (
                        <button
                          className="text-xs underline opacity-90 hover:opacity-100"
                          onClick={() => { setVideoUrl(item.video_url || null); setVideoOpen(true); }}
                        >
                          ▶︎ Video
                        </button>
                      )}
                    </div>

                    {/* Dettagli: cardio vs forza */}
                    {item.is_cardio ? (
                      <div className="text-xs opacity-70">
                        {item.cardio_minutes != null && item.cardio_minutes !== 0 ? `${item.cardio_minutes} min` : ''}
                        {item.cardio_distance_km != null && Number(item.cardio_distance_km) !== 0 ? ` • ${item.cardio_distance_km} km` : ''}
                        {item.cardio_intensity ? ` • ${item.cardio_intensity}` : ''}
                        {item.method ? ` • Metodo: ${item.method}` : ''}
                        {item.method_details ? ` (${item.method_details})` : ''}
                        {item.machine_label ? ` • Macchina: ${item.machine_label}` : ''}
                      </div>
                    ) : (
                      <div className="text-xs opacity-70">
                        {item.target_sets != null ? `${item.target_sets}x` : ''}
                        {item.target_reps != null ? `${item.target_reps}` : (item.target_sets != null ? '—' : '')}
                        {item.target_load != null ? ` • ${item.target_load} kg` : ''}
                        {program.use_rpe && (item.rpe_target != null) ? ` • RPE ${item.rpe_target}` : ''}
                        {item.method ? ` • Metodo: ${item.method}` : ''}
                        {item.method_details ? ` (${item.method_details})` : ''}
                        {item.machine_label ? ` • Macchina: ${item.machine_label}` : ''}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <button className={btnGhost} onClick={()=>deleteItem(item.id)}>Elimina</button>
                  )}
                </div>
              ))}

              {(exByDay[d.id]?.length ?? 0) === 0 && (
                <div className="text-sm opacity-70">Nessun esercizio in questo giorno.</div>
              )}
            </div>
          </div>
        ))}

        {days.length === 0 && (
          <div className={card}>Non ci sono giorni in questo programma.</div>
        )}
      </div>

      {/* Modal video */}
      <VideoModal url={videoUrl} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}
