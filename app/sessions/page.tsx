'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, btnPrimary, btnGhost, select } from '@/components/ui';

type SessionRow = {
  id: string;
  user_id: string;
  program_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  user_email?: string | null;
  program_name?: string | null;
};

type ProgramOption = { id: string; name: string };

/** Tipizzazione della riga restituita dalla select con relations */
type SessionQueryRow = {
  id: string;
  user_id: string;
  program_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  profiles?: { email?: string | null } | null;   // alias: profiles:user_id ( email )
  programs?: { name?: string | null } | null;    // alias: programs:program_id ( name )
};

export default function SessionsPage() {
  const supabase = createClient();
  const { userId } = useProfile();

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [selProgram, setSelProgram] = useState<string>('');

  const load = async () => {
    setMsg(null);

    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        id, user_id, program_id, started_at, ended_at,
        profiles:user_id ( email ),
        programs:program_id ( name )
      `)
      .order('started_at', { ascending: false });

    if (error) { setMsg(error.message); return; }

    const mapped: SessionRow[] = ((data ?? []) as SessionQueryRow[]).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      program_id: s.program_id,
      started_at: s.started_at,
      ended_at: s.ended_at,
      user_email: s.profiles?.email ?? null,
      program_name: s.programs?.name ?? null,
    }));
    setRows(mapped);

    const { data: ps } = await supabase
      .from('programs')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(50);
    setPrograms((ps ?? []) as ProgramOption[]);
  };

  useEffect(() => { load(); }, []);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        program_id: selProgram || null,
        started_at: new Date().toISOString(),
      });
    if (error) setMsg(error.message);
    setBusy(false);
    setSelProgram('');
    await load();
  };

  const endSession = async (id: string) => {
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('workout_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Eliminare questa sessione?')) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  };

  const yourSessions = useMemo(() => rows.filter(r => r.user_id === userId), [rows, userId]);

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Sessioni</h1>
        <p className="text-sm opacity-80">Avvia, apri, termina ed elimina le sessioni di allenamento.</p>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      <div className={card}>
        <h2 className="text-lg font-semibold mb-3">Nuova sessione</h2>
        <form onSubmit={createSession} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <label className="flex flex-col gap-1 md:col-span-3">
            <span className="text-xs opacity-70">Programma (opz.)</span>
            <select className={select} value={selProgram} onChange={(e)=>setSelProgram(e.target.value)}>
              <option value="">— Nessun programma —</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <div className="md:col-span-2 flex items-end">
            <button className={btnPrimary} disabled={busy}>
              {busy ? 'Creo…' : 'Avvia sessione'}
            </button>
          </div>
        </form>
      </div>

      <div className={card}>
        <h2 className="text-base font-semibold mb-2">Tutte le sessioni visibili</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map(s => (
            <div key={s.id} className="border border-neutral-700 rounded px-3 py-2 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  <Link href={`/sessions/${s.id}`} className="underline underline-offset-2 hover:opacity-80">
                    {s.program_name ?? 'Sessione libera'}
                  </Link>
                </div>
                <div className="text-xs opacity-70">
                  Inizio: {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                  {s.ended_at ? ` • Fine: ${new Date(s.ended_at).toLocaleString()}` : ''}
                  {s.user_email ? ` • Utente: ${s.user_email}` : ''}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!s.ended_at && (
                  <Link href={`/sessions/${s.id}`} className={btnPrimary}>Apri</Link>
                )}
                {!s.ended_at && (
                  <button className={btnGhost} onClick={()=>endSession(s.id)}>Termina</button>
                )}
                <button className={btnGhost} onClick={()=>del(s.id)}>Elimina</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm opacity-70">Nessuna sessione.</p>}
        </div>
      </div>

      <div className={card}>
        <h2 className="text-base font-semibold mb-2">Le tue sessioni</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {yourSessions.map(s => (
            <div key={s.id} className="border border-neutral-700 rounded px-3 py-2 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  <Link href={`/sessions/${s.id}`} className="underline underline-offset-2 hover:opacity-80">
                    {s.program_name ?? 'Sessione libera'}
                  </Link>
                </div>
                <div className="text-xs opacity-70">
                  Inizio: {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                  {s.ended_at ? ` • Fine: ${new Date(s.ended_at).toLocaleString()}` : ''}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!s.ended_at && (
                  <Link href={`/sessions/${s.id}`} className={btnPrimary}>Apri</Link>
                )}
                {!s.ended_at && (
                  <button className={btnGhost} onClick={()=>endSession(s.id)}>Termina</button>
                )}
                <button className={btnGhost} onClick={()=>del(s.id)}>Elimina</button>
              </div>
            </div>
          ))}
          {yourSessions.length === 0 && <p className="text-sm opacity-70">Nessuna tua sessione.</p>}
        </div>
      </div>
    </div>
  );
}
