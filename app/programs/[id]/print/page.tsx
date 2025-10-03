'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { card, btnGhost } from '@/components/ui';

type Program = {
  id: string;
  name: string;
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
  machine_label?: string | null;
  method?: string | null;
  method_details?: string | null;

  // cardio
  is_cardio: boolean;
  cardio_minutes: number | null;
  cardio_distance_km: number | null;
  cardio_intensity: string | null;
};

export default function ProgramPrintPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const programId = params?.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [exs, setExs] = useState<ProgramExercise[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setMsg(null);

    const { data: p, error: ep } = await supabase
      .from('programs')
      .select('id, name, start_date, end_date, use_rpe')
      .eq('id', programId)
      .single();
    if (ep) { setMsg(ep.message); return; }
    setProgram(p as Program);

    const { data: d, error: ed } = await supabase
      .from('program_days')
      .select('id, program_id, day_index, name')
      .eq('program_id', programId)
      .order('day_index', { ascending: true });
    if (ed) { setMsg(ed.message); return; }
    setDays((d ?? []) as Day[]);

    const dayIds = (d ?? []).map(x => x.id);
    const idsForIn = dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000'];

    const { data: pe, error: ee } = await supabase
      .from('program_exercises')
      .select(`
        id, program_day_id, exercise_id, order_index, target_sets, target_reps, target_load, rpe_target, notes,
        method, method_details, is_cardio, cardio_minutes, cardio_distance_km, cardio_intensity,
        exercises ( name ),
        machines ( name, number, location )
      `)
      .in('program_day_id', idsForIn)
      .order('order_index', { ascending: true });

    if (ee) { setMsg(ee.message); return; }

    const mapped = (pe ?? []).map(row => {
      const exName = (row as any).exercises?.name ?? '—';
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
        exercise_name: exName,
        machine_label: machineLabel,

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

  // helper per cardio
  const cardioStr = (it: ProgramExercise) => {
    const parts: string[] = [];
    if (it.cardio_minutes) parts.push(`${it.cardio_minutes} min`);
    if (it.cardio_distance_km) parts.push(`${it.cardio_distance_km} km`);
    if (it.cardio_intensity) parts.push(it.cardio_intensity);
    return parts.join(' • ') || '—';
  };

  // helper per campi scrivibili
  const WriteIn = ({ w = '3rem' }: { w?: string }) => (
    <span className="writein" style={{ minWidth: w }} />
  );
  const NumOrBlank = ({ v, w = '3rem' }: { v: number | null | undefined; w?: string }) =>
    v != null ? <>{v}</> : <WriteIn w={w} />;

  return (
    <div className="space-y-4 print-page">
      <div className={'no-print ' + card}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">{program.name}</div>
          <button className={btnGhost} onClick={() => window.print()}>Stampa</button>
        </div>
        <div className="text-xs opacity-70">
          Inizio: {program.start_date ?? '—'}{program.end_date ? ` • Fine: ${program.end_date}` : ''}
          {program.use_rpe ? ' • RPE attivo' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {days.map(d => (
          <div key={d.id} className={card + ' avoid-break'}>
            <h2 className="text-base font-semibold mb-2">
              {d.name ?? `Giorno ${d.day_index}`}
            </h2>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-neutral-700">
                  <th className="py-1 pr-2">Esercizio</th>
                  <th className="py-1 pr-2">Serie × Rip.</th>
                  <th className="py-1 pr-2">Kg</th>
                  {program.use_rpe && <th className="py-1 pr-2">RPE</th>}
                  <th className="py-1 pr-2">Metodo</th>
                  <th className="py-1 pr-2">Dettagli</th>
                  <th className="py-1 pr-2">Macchina</th>
                  <th className="py-1">Note</th>
                </tr>
              </thead>
              <tbody>
                {(exByDay[d.id] ?? []).map(item => (
                  <tr key={item.id} className="border-b border-neutral-800 align-top">
                    <td className="py-1 pr-2">{item.exercise_name ?? '—'}</td>

                    {item.is_cardio ? (
                      <>
                        <td className="py-1 pr-2">—</td>
                        <td className="py-1 pr-2">—</td>
                        {program.use_rpe && <td className="py-1 pr-2">—</td>}
                        <td className="py-1 pr-2">Cardio</td>
                        <td className="py-1 pr-2">{cardioStr(item)}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 pr-2">
                          {item.target_sets != null ? item.target_sets : <WriteIn w="2rem" />} ×{' '}
                          {item.target_reps != null ? item.target_reps : <WriteIn w="2rem" />}
                        </td>
                        <td className="py-1 pr-2">
                          <NumOrBlank v={item.target_load} w="3rem" />
                        </td>
                        {program.use_rpe && (
                          <td className="py-1 pr-2">
                            <NumOrBlank v={item.rpe_target} w="2rem" />
                          </td>
                        )}
                        <td className="py-1 pr-2">{item.method ?? '—'}</td>
                        <td className="py-1 pr-2">{item.method_details ?? '—'}</td>
                      </>
                    )}

                    <td className="py-1 pr-2">{item.machine_label ?? '—'}</td>
                    <td className="py-1">{item.notes ?? '—'}</td>
                  </tr>
                ))}

                {(exByDay[d.id]?.length ?? 0) === 0 && (
                  <tr>
                    <td className="py-2 text-xs opacity-70" colSpan={program.use_rpe ? 8 : 7}>
                      Nessun esercizio in questo giorno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {days.length === 0 && (
          <div className={card}>Non ci sono giorni in questo programma.</div>
        )}
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      <style jsx>{`
        .writein {
          display: inline-block;
          height: 1.1rem;
          line-height: 1.1rem;
          border-bottom: 1px solid rgba(120,120,120,.7);
          vertical-align: bottom;
        }
        @media print {
          .writein { border-bottom: 1px solid #000; }
        }
      `}</style>
    </div>
  );
}
