'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '@/components/ui';

type Program = {
  id: string;
  name: string;
  owner_id: string | null;
  member_id: string | null;
  start_date: string | null;
  end_date: string | null;
  use_rpe: boolean;
  is_template: boolean;         // 👈 nuovo
  member_name?: string | null;  // derivato
  author_name?: string | null;  // derivato
};

type ProfileRow = { id: string; email: string | null; full_name: string | null };
type ProfileOption = ProfileRow;

export default function ProgramsPage() {
  const supabase = createClient();
  const { isOwner, isTrainer, userId } = useProfile();

  const [rows, setRows] = useState<Program[]>([]);
  const [people, setPeople] = useState<ProfileOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form creazione
  const [name, setName] = useState('');
  const [member, setMember] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [useRpe, setUseRpe] = useState<boolean>(false);
  const [isTemplate, setIsTemplate] = useState<boolean>(false); // 👈 archivio

  // form assegnazione inline (per template)
  const [assignOpenId, setAssignOpenId] = useState<string | null>(null);
  const [assignMember, setAssignMember] = useState<string>('');
  const [assignName, setAssignName] = useState<string>('');
  const [assignStart, setAssignStart] = useState<string>('');
  const [assignEnd, setAssignEnd] = useState<string>('');

  const canEdit = isOwner || isTrainer;

  const load = async () => {
    setMsg(null);

    // 1) programmi
    const { data: programs, error } = await supabase
      .from('programs')
      .select('id, name, owner_id, member_id, start_date, end_date, use_rpe, is_template')
      .order('created_at', { ascending: false });
    if (error) { setMsg(error.message); return; }

    const progs = (programs ?? []) as Program[];

    // 2) profili coinvolti (member + owner)
    const memberIds = Array.from(new Set(progs.map(p => p.member_id).filter(Boolean))) as string[];
    const ownerIds  = Array.from(new Set(progs.map(p => p.owner_id).filter(Boolean))) as string[];
    const allIds = Array.from(new Set([...memberIds, ...ownerIds]));

    let profileMap: Record<string, { email: string|null; full_name: string|null }> = {};
    if (allIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', allIds);
      (profs ?? []).forEach((r: any) => {
        profileMap[r.id] = {
          email: r.email ?? null,
          full_name: r.full_name ?? null,
        };
      });
    }

    // 3) map campi derivati
    const mapped = progs.map(p => ({
      ...p,
      member_name: p.member_id ? (profileMap[p.member_id]?.full_name ?? null) : null,
      author_name: p.owner_id ? (profileMap[p.owner_id]?.full_name ?? profileMap[p.owner_id]?.email ?? null) : null,
    }));

    setRows(mapped);

    // 4) elenco persone per assegnazione/creazione (owner/trainer)
    if (canEdit) {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });
      setPeople((members ?? []) as ProfileOption[]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isOwner, isTrainer]);

  const createProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !name.trim() || !userId) return;
    setBusy(true); setMsg(null);
    const payload: any = {
      name: name.trim(),
      owner_id: userId,
      member_id: isTemplate ? null : (member || null), // se archivio, non assegnare
      start_date: isTemplate ? null : (start || null),
      end_date: isTemplate ? null : (end || null),
      use_rpe: useRpe,
      is_template: isTemplate,
    };
    const { error } = await supabase.from('programs').insert(payload);
    if (error) setMsg(error.message);
    setBusy(false);
    setName(''); setMember(''); setStart(''); setEnd(''); setUseRpe(false); setIsTemplate(false);
    await load();
  };

  const del = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Eliminare questo programma?')) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('programs').delete().eq('id', id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  };

  const assignFromTemplate = async (templateId: string) => {
    if (!canEdit || !assignMember) return;
    setBusy(true); setMsg(null);

    // chiama la RPC
    const { data, error } = await supabase.rpc('clone_program', {
      p_template_id: templateId,
      p_member_id: assignMember,
      p_new_name: assignName || null,
      p_start_date: assignStart || null,
      p_end_date: assignEnd || null,
    });

    setBusy(false);
    setAssignOpenId(null);
    setAssignMember(''); setAssignName(''); setAssignStart(''); setAssignEnd('');

    if (error) { setMsg(error.message); return; }

    // apri il nuovo programma clonato
    if (data) {
      window.location.href = `/programs/${data}`;
    } else {
      await load();
    }
  };

  const header = useMemo(() => (
    <div className={card}>
      <h1 className="text-2xl font-bold">Programmi</h1>
      <p className="text-sm opacity-80">
        {canEdit ? 'Crea, archivia e assegna le schede di allenamento.' : 'Schede assegnate a te.'}
      </p>
    </div>
  ), [canEdit]);

  return (
    <div className="space-y-6">
      {header}

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {/* Form creazione solo owner/trainer */}
      {canEdit && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Crea nuovo programma</h2>
          <form onSubmit={createProgram} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs opacity-70">Nome programma</span>
              <input className={input} value={name} onChange={(e)=>setName(e.target.value)} placeholder="Es: Base Nuovi Iscritti" />
            </label>

            {/* Se NON è archivio, mostro assegnazione e date */}
            {!isTemplate && (
              <>
                <label className="flex flex-col gap-1 md:col-span-1">
                  <span className="text-xs opacity-70">Assegna a (opz.)</span>
                  <select className={select} value={member} onChange={(e)=>setMember(e.target.value)}>
                    <option value="">— Nessuno —</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name ? `${p.full_name} (${p.email})` : p.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs opacity-70">Inizio (opz.)</span>
                  <input type="date" className={input} value={start} onChange={(e)=>setStart(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs opacity-70">Fine (opz.)</span>
                  <input type="date" className={input} value={end} onChange={(e)=>setEnd(e.target.value)} />
                </label>
              </>
            )}

            {/* Riga opzioni */}
            <div className="md:col-span-5 flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={useRpe} onChange={(e)=>setUseRpe(e.target.checked)} />
                <span className="text-sm">Abilita RPE</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={isTemplate} onChange={(e)=>setIsTemplate(e.target.checked)} />
                <span className="text-sm">Salva come archivio (non assegnato)</span>
              </label>
              <div className="ml-auto">
                <button className={btnPrimary} disabled={busy}>
                  {busy ? 'Creo…' : 'Crea programma'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className={card}>
        <div className="grid grid-cols-1 gap-2">
          {rows.map(p => (
            <div key={p.id} className="border border-neutral-700 rounded p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/programs/${p.id}`} className="font-medium hover:underline truncate">{p.name}</Link>
                    {p.is_template && (
                      <span className="px-2 py-0.5 text-xs rounded border border-neutral-600">Archivio</span>
                    )}
                  </div>
                  <div className="text-xs opacity-70">
                    {p.start_date ?? '—'} {p.end_date ? `→ ${p.end_date}` : ''}
                    {p.member_name ? ` • Atleta: ${p.member_name}` : ''}
                    {p.author_name ? ` • Autore: ${p.author_name}` : ''}
                    {p.use_rpe ? ` • RPE attivo` : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(isOwner || (isTrainer && p.owner_id === userId)) && (
                    <button className={btnGhost} onClick={()=>del(p.id)}>Elimina</button>
                  )}
                  {/* Assegna solo per template */}
                  {canEdit && p.is_template && (
                    <button
                      className={btnGhost}
                      onClick={() => {
                        setAssignOpenId(prev => prev === p.id ? null : p.id);
                        setAssignName(p.name); // precompila con il nome template
                      }}
                    >
                      Assegna
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer assegnazione */}
              {canEdit && p.is_template && assignOpenId === p.id && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs opacity-70">Nome nuovo programma</span>
                    <input className={input} value={assignName} onChange={(e)=>setAssignName(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-1">
                    <span className="text-xs opacity-70">Assegna a</span>
                    <select className={select} value={assignMember} onChange={(e)=>setAssignMember(e.target.value)}>
                      <option value="">— Seleziona membro —</option>
                      {people.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">Inizio</span>
                    <input type="date" className={input} value={assignStart} onChange={(e)=>setAssignStart(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs opacity-70">Fine (opz.)</span>
                    <input type="date" className={input} value={assignEnd} onChange={(e)=>setAssignEnd(e.target.value)} />
                  </label>
                  <div className="md:col-span-5 flex items-end justify-end gap-2">
                    <button className={btnGhost} onClick={()=>setAssignOpenId(null)}>Annulla</button>
                    <button
                      className={btnPrimary}
                      disabled={busy || !assignMember}
                      onClick={()=>assignFromTemplate(p.id)}
                    >
                      {busy ? 'Assegno…' : 'Crea da archivio'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm opacity-70">Nessun programma.</p>
          )}
        </div>
      </div>
    </div>
  );
}
