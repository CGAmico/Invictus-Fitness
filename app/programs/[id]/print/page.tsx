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
  owner_id: string | null;
  member_id: string | null;
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

  target_sets_text?: string | null;
  target_reps_text?: string | null;
  target_load_text?: string | null;

  rpe_target: number | null;
  notes: string | null;
  exercise_name?: string;
  machine_label?: string | null;
  method?: string | null;
  method_details?: string | null;

  rest_seconds: number | null;

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
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);

  const [days, setDays] = useState<Day[]>([]);
  const [exs, setExs] = useState<ProgramExercise[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setMsg(null);

    const { data: p, error: ep } = await supabase
      .from('programs')
      .select('id, name, start_date, end_date, use_rpe, owner_id, member_id')
      .eq('id', programId)
      .single();
    if (ep) { setMsg(ep.message); return; }
    setProgram(p as Program);

    if (p?.owner_id) {
      const { data: profA } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', p.owner_id)
        .single();
      setAuthorName(profA?.full_name || profA?.email || null);
    } else {
      setAuthorName(null);
    }

    if (p?.member_id) {
      const { data: profM } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', p.member_id)
        .single();
      setMemberName(profM?.full_name || profM?.email || null);
    } else {
      setMemberName(null);
    }

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
        id, program_day_id, exercise_id, order_index,
        target_sets, target_reps, target_load,
        target_sets_text, target_reps_text, target_load_text,
        rpe_target, notes, method, method_details, rest_seconds,
        is_cardio, cardio_minutes, cardio_distance_km, cardio_intensity,
        exercises ( name ),
        machines ( name, number, location )
      `)
      .in('program_day_id', idsForIn)
      .order('order_index', { ascending: true });

    if (ee) { setMsg(ee.message); return; }

    const mapped = (pe ?? []).map(row => {
      const exName = (row as any).exercises?.name ?? '';
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

        target_sets_text: (row as any).target_sets_text ?? null,
        target_reps_text: (row as any).target_reps_text ?? null,
        target_load_text: (row as any).target_load_text ?? null,

        rpe_target: row.rpe_target,
        notes: row.notes,
        method: (row as any).method ?? null,
        method_details: (row as any).method_details ?? null,
        exercise_name: exName,
        machine_label: machineLabel,

        rest_seconds: (row as any).rest_seconds ?? null,

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

  // Helpers ------------------------------------------------------------------
  const WriteIn = ({ w = '3rem' }: { w?: string }) => (<span className="writein" style={{ minWidth: w }} />);
  const NumOrBlank = ({ v, w = '3rem' }: { v: number | null | undefined; w?: string }) =>
    v != null ? <>{v}</> : <WriteIn w={w} />;

  const pref = (text?: string | null, num?: number | null) =>
    (text && text.trim()) ? text.trim() : (num != null ? String(num) : '');

  const cardioStr = (it: ProgramExercise) => {
    const parts: string[] = [];
    if (it.cardio_minutes != null && it.cardio_minutes !== 0) parts.push(`${it.cardio_minutes} min`);
    if (it.cardio_distance_km != null && Number(it.cardio_distance_km) !== 0) parts.push(`${it.cardio_distance_km} km`);
    if (it.cardio_intensity) parts.push(it.cardio_intensity);
    return parts.join(' • ');
  };

  // --------------------------------------------------------------------------

  return (
    <div className="space-y-4 print-page">
      {/* Intestazione con metadati + note scrivibili */}
      <div className={'no-print ' + card}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">{program.name}</div>
          <button className={btnGhost} onClick={() => window.print()}>Stampa</button>
        </div>
      </div>

      <div className={card + ' avoid-break'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div><span className="opacity-70">Autore:</span> {authorName || <WriteIn w="10rem" />}</div>
            <div><span className="opacity-70">Assegnato a:</span> {memberName || <WriteIn w="10rem" />}</div>
            <div>
              <span className="opacity-70">Periodo:</span>{' '}
              {program.start_date ? program.start_date : <WriteIn w="6rem" />}
              {' '}→{' '}
              {program.end_date ? program.end_date : <WriteIn w="6rem" />}
            </div>
            {program.use_rpe && <div><span className="opacity-70">RPE:</span> attivo</div>}
          </div>
          <div>
            <div className="opacity-70 mb-1">Note</div>
            <div className="note-box" />
          </div>
        </div>
      </div>

      {/* Tabella stampabile */}
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
                  <th className="py-1 pr-2">Recupero</th>
                  {program.use_rpe && <th className="py-1 pr-2">RPE</th>}
                  <th className="py-1 pr-2">Metodo</th>
                  <th className="py-1 pr-2">Dettagli</th>
                  <th className="py-1 pr-2">Macchina</th>
                  <th className="py-1">Note</th>
                </tr>
              </thead>
              <tbody>
                {(exByDay[d.id] ?? []).map(item => {
                  const setsView = pref(item.target_sets_text, item.target_sets);
                  const repsView = pref(item.target_reps_text, item.target_reps);
                  const loadView = (item.target_load_text && item.target_load_text.trim())
                    ? item.target_load_text.trim()
                    : (item.target_load != null ? String(item.target_load) : '');

                  return (
                    <tr key={item.id} className="border-b border-neutral-800 align-top">
                      <td className="py-1 pr-2">{item.exercise_name || <WriteIn w="10rem" />}</td>

                      {/* Serie × Rip */}
                      <td className="py-1 pr-2">
                        {setsView ? setsView : <WriteIn w="2rem" />} ×{' '}
                        {repsView ? repsView : <WriteIn w="2rem" />}
                      </td>

                      {/* Kg */}
                      <td className="py-1 pr-2">
                        {loadView ? loadView : <WriteIn w="3.2rem" />}
                      </td>

                      {/* Recupero (sec) */}
                      <td className="py-1 pr-2">
                        {item.rest_seconds != null ? item.rest_seconds : <WriteIn w="3rem" />}
                      </td>

                      {/* RPE (se attivo) */}
                      {program.use_rpe && (
                        <td className="py-1 pr-2">
                          {item.rpe_target != null ? item.rpe_target : <WriteIn w="2rem" />}
                        </td>
                      )}

                      {/* Metodo / Dettagli (cardio → dettagli = stringa cardio) */}
                      <td className="py-1 pr-2">{item.method || <WriteIn w="6rem" />}</td>
                      <td className="py-1 pr-2">
                        {item.is_cardio
                          ? (cardioStr(item) || <WriteIn w="10rem" />)
                          : (item.method_details || <WriteIn w="10rem" />)}
                      </td>

                      <td className="py-1 pr-2">{item.machine_label || <WriteIn w="8rem" />}</td>
                      <td className="py-1">{item.notes || <WriteIn w="12rem" />}</td>
                    </tr>
                  );
                })}

                {(exByDay[d.id]?.length ?? 0) === 0 && (
                  <tr>
                    <td className="py-2 text-xs opacity-70" colSpan={program.use_rpe ? 9 : 8}>
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
        .note-box {
          min-height: 90px;
          border: 1px solid rgba(120,120,120,.7);
          border-radius: 6px;
          background: transparent;
        }
        @media print {
          .writein  { border-bottom: 1px solid #000; }
          .note-box { border-color: #000; }
        }
      `}</style>
    </div>
  );
}
