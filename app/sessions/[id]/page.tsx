'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, select, input, btnPrimary, btnGhost } from '@/components/ui';
import Link from 'next/link';

type Session = { id: string; program_id: string | null; started_at: string | null; ended_at: string | null; };
type Day = { id: string; day_index: number; name: string | null; program_id: string; };
type ProgramExercise = {
  id: string; program_day_id: string; exercise_id: string | null; order_index: number | null;
  target_sets: number | null; target_reps: number | null; target_load: number | null; rpe_target: number | null; notes: string | null;
  exercises?: { name: string | null; muscle_group: string | null } | null;
  machines?: { number: number | null; name: string | null } | null;
};
type LastSet = { program_exercise_id: string; load: number | null; reps: number | null; rpe: number | null; created_at: string; };

export default function SessionTrainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sessionId = id;

  const supabase = createClient();
  const { userId } = useProfile();

  const [session, setSession] = useState<Session | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [exByDay, setExByDay] = useState<Record<string, ProgramExercise[]>>({});
  const [selDayId, setSelDayId] = useState<string>('');
  const [lastByEx, setLastByEx] = useState<Record<string, LastSet>>({});
  const [form, setForm] = useState<Record<string, { load?: string; reps?: string; rpe?: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => exByDay[selDayId] ?? [], [exByDay, selDayId]);

  const loadAll = async () => {
    setMsg(null);

    const { data: s, error: es } = await supabase
      .from('workout_sessions')
      .select('id, program_id, started_at, ended_at')
      .eq('id', sessionId)
      .single();
    if (es) { setMsg(es.message); return; }
    setSession(s as Session);

    if (!s?.program_id) {
      setMsg('Sessione libera: attualmente la registrazione set richiede un programma collegato.');
      setDays([]); setExByDay({}); setLastByEx({});
      return;
    }

    const { data: ds, error: ed } = await supabase
      .from('program_days')
      .select('id, day_index, name, program_id')
      .eq('program_id', s.program_id)
      .order('day_index', { ascending: true });
    if (ed) { setMsg(ed.message); return; }
    setDays(ds as Day[]);
    if (ds && ds.length && !selDayId) setSelDayId(ds[0].id);

    const { data: pes, error: epe } = await supabase
      .from('program_exercises')
      .select(`
        id, program_day_id, exercise_id, order_index, target_sets, target_reps, target_load, rpe_target, notes,
        exercises:exercise_id ( name, muscle_group ),
        machines:machine_id ( number, name )
      `)
      .in('program_day_id', (ds ?? []).map((d: any) => d.id))
      .order('order_index', { ascending: true });
    if (epe) { setMsg(epe.message); return; }

    const byDay: Record<string, ProgramExercise[]> = {};
    (ds ?? []).forEach((d: any) => { byDay[d.id] = []; });
    (pes ?? []).forEach((e: any) => { (byDay[e.program_day_id] ??= []).push(e as ProgramExercise); });
    setExByDay(byDay);

    // ultimi dell'utente per quegli exercises
    const allProgExIds = (pes ?? []).map((e: any) => e.id);
    if (allProgExIds.length && userId) {
      const { data: ws } = await supabase
        .from('workout_sets')
        .select('program_exercise_id, load, reps, rpe, created_at')
        .eq('user_id', userId)
        .in('program_exercise_id', allProgExIds)
        .order('created_at', { ascending: false });

      const map: Record<string, LastSet> = {};
      (ws ?? []).forEach((row: any) => { if (!map[row.program_exercise_id]) map[row.program_exercise_id] = row; });
      setLastByEx(map);

      const f: typeof form = {};
      Object.keys(map).forEach(pid => {
        f[pid] = {
          load: map[pid].load != null ? String(map[pid].load) : '',
          reps: map[pid].reps != null ? String(map[pid].reps) : '',
          rpe:  map[pid].rpe  != null ? String(map[pid].rpe)  : '',
        };
      });
      setForm(f);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [sessionId]);

  const onChange = (pid: string, field: 'load'|'reps'|'rpe', value: string) => {
    setForm(prev => ({ ...prev, [pid]: { ...(prev[pid] ?? {}), [field]: value } }));
  };

  const saveSet = async (pe: ProgramExercise) => {
    if (!userId || !sessionId) return;
    const vals = form[pe.id] ?? {};
    const load = vals.load ? Number(vals.load) : null;
    const reps = vals.reps ? Number(vals.reps) : null;
    const rpe  = vals.rpe  ? Number(vals.rpe)  : null;

    setBusy(true); setMsg(null);
    const { error } = await supabase.from('workout_sets').insert({
      user_id: userId,
      session_id: sessionId,
      program_id: session?.program_id ?? null,   // 👈 salva programma
      program_exercise_id: pe.id,
      exercise_id: pe.exercise_id,               // 👈 salva esercizio
      load, reps, rpe,
    });
    if (error) setMsg(error.message);
    setBusy(false);
    await loadAll();
  };

  const endSession = async () => {
    if (!session) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('workout_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) setMsg(error.message);
    setBusy(false);
    await loadAll();
  };

  const ended = !!session?.ended_at;

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Allenamento</h1>
        <p className="text-sm opacity-80">
          {session?.program_id ? 'Programma assegnato' : 'Sessione libera'} • Sessione: {sessionId.slice(0,8)}
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/sessions" className={btnGhost}>Torna alle sessioni</Link>
          {!ended && <button onClick={endSession} className={btnGhost}>Termina sessione</button>}
        </div>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {session?.program_id && (
        <>
          <div className={card}>
            <label className="flex flex-col gap-1 max-w-xs">
              <span className="text-xs opacity-70">Giorno</span>
              <select className={select} value={selDayId} onChange={(e)=>setSelDayId(e.target.value)}>
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name ?? `Giorno ${d.day_index ?? ''}`.trim()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={card}>
            <h2 className="text-base font-semibold mb-2">
              {(() => { const d = days.find(x => x.id === selDayId); return d ? (d.name ?? `Giorno ${d.day_index}`) : 'Giorno'; })()}
            </h2>

            <div className="space-y-3">
              {active.map(pe => {
                const last = lastByEx[pe.id];
                const vals = form[pe.id] ?? {};
                return (
                  <div key={pe.id} className="border border-neutral-700 rounded p-3">
                    <div className="font-medium">{pe.exercises?.name ?? 'Esercizio'}</div>
                    <div className="text-xs opacity-70">
                      Target: {pe.target_sets ?? '—'}×{pe.target_reps ?? '—'}
                      {pe.target_load != null ? ` • ${pe.target_load} kg` : ''}
                      {pe.rpe_target != null ? ` • RPE ${pe.rpe_target}` : ''}
                      {pe.machines?.number != null ? ` • Macchina #${pe.machines.number}` : ''}
                    </div>
                    {last && (
                      <div className="text-xs opacity-70">
                        Ultimo: {last.load ?? '—'} kg × {last.reps ?? '—'} • RPE {last.rpe ?? '—'} ({new Date(last.created_at).toLocaleDateString()})
                      </div>
                    )}

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">Kg</span>
                        <input className={input} inputMode="decimal" value={vals.load ?? ''} onChange={e=>setForm(p=>({ ...p, [pe.id]: { ...(p[pe.id] ?? {}), load: e.target.value } }))} disabled={ended} placeholder="Kg" />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">Ripetizioni</span>
                        <input className={input} inputMode="numeric" value={vals.reps ?? ''} onChange={e=>setForm(p=>({ ...p, [pe.id]: { ...(p[pe.id] ?? {}), reps: e.target.value } }))} disabled={ended} placeholder="Reps" />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">RPE</span>
                        <input className={input} inputMode="decimal" value={vals.rpe ?? ''} onChange={e=>setForm(p=>({ ...p, [pe.id]: { ...(p[pe.id] ?? {}), rpe: e.target.value } }))} disabled={ended} placeholder="RPE" />
                      </label>
                    </div>

                    {!ended && (
                      <div className="mt-2">
                        <button className={btnPrimary} onClick={()=>saveSet(pe)}>
                          Salva
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {active.length === 0 && <p className="text-sm opacity-70">Nessun esercizio in questo giorno.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
