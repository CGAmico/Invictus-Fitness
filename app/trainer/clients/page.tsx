'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '@/components/ui';

type Role = 'owner'|'trainer'|'member';
type Profile = { id: string; full_name: string|null; email: string|null; role: Role };
type TM = { trainer_id: string; member_id: string };

export default function ClientsPage() {
  const supabase = createClient();
  const { isOwner, isTrainer, userId } = useProfile();

  const [people, setPeople] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [links, setLinks] = useState<TM[]>([]); // righe trainer_members visibili
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // form trainer: assegna a me
  const [assignToMeId, setAssignToMeId] = useState<string>('');

  // form owner: assegna trainer ⇄ member
  const [selTrainer, setSelTrainer] = useState<string>('');
  const [selMember, setSelMember] = useState<string>('');

  const load = async () => {
    setMsg(null);

    // 1) profili
    const { data: profs, error: e1 } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true });
    if (e1) { setMsg(e1.message); return; }
    const list = (profs ?? []) as Profile[];
    setPeople(list);
    setMembers(list.filter(p => p.role === 'member'));
    setTrainers(list.filter(p => p.role === 'trainer'));

    // 2) mapping trainer_members (RLS: owner vede tutto, trainer vede solo i propri)
    const { data: tms, error: e2 } = await supabase
      .from('trainer_members')
      .select('trainer_id, member_id');
    if (e2) { setMsg(e2.message); return; }
    setLinks((tms ?? []) as TM[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isOwner, isTrainer]);

  // util
  const byId: Record<string, Profile> = useMemo(() => {
    const map: Record<string, Profile> = {};
    people.forEach(p => { map[p.id] = p; });
    return map;
  }, [people]);

  const myLinks = useMemo(() => {
    if (!userId) return [];
    return links.filter(l => l.trainer_id === userId);
  }, [links, userId]);

  const myClients = useMemo(() => {
    return myLinks
      .map(l => byId[l.member_id])
      .filter(Boolean)
      .sort((a,b) => (a.full_name||'').localeCompare(b.full_name||''));
  }, [myLinks, byId]);

  // vista owner: raggruppa per trainer
  const groupedByTrainer = useMemo(() => {
    const groups: Record<string, Profile[]> = {};
    links.forEach(l => {
      if (!groups[l.trainer_id]) groups[l.trainer_id] = [];
      const mem = byId[l.member_id];
      if (mem) groups[l.trainer_id].push(mem);
    });
    // ordina ogni lista
    Object.keys(groups).forEach(k => groups[k].sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||'')));
    return groups;
  }, [links, byId]);

  // filtro ricerca (su tutti i profili, utile nella sezione "Tutti")
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(p =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  }, [people, search]);

  // azioni ---------------------------------------------

  // trainer: assegna MEMBER a me
  const assignToMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTrainer || !userId || !assignToMeId) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('trainer_members')
      .insert({ trainer_id: userId, member_id: assignToMeId });
    if (error) setMsg(error.message);
    setAssignToMeId('');
    setBusy(false);
    await load();
  };

  // owner: assegna trainer ⇄ member
  const ownerAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !selTrainer || !selMember) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('trainer_members')
      .insert({ trainer_id: selTrainer, member_id: selMember });
    if (error) setMsg(error.message);
    setSelTrainer(''); setSelMember('');
    setBusy(false);
    await load();
  };

  // rimuovi associazione
  const unlink = async (trainer_id: string, member_id: string) => {
    if (!confirm('Rimuovere questa assegnazione?')) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase
      .from('trainer_members')
      .delete()
      .match({ trainer_id, member_id });
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  };

  // UI -------------------------------------------------

  const ListItem: React.FC<{ p: Profile; right?: React.ReactNode }> = ({ p, right }) => (
    <div className="border border-neutral-700 rounded px-3 py-2 flex items-center justify-between">
      <div>
        <div className="font-medium">{p.full_name || '—'}</div>
        <div className="text-xs opacity-70">
          {p.email || '—'} • ruolo: {p.role}
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {p.role === 'member' && (
          <a href={`/admin/anamnesi/${p.id}`} className={btnGhost}>Anamnesi</a>
        )}
        {right}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Clienti</h1>
        <p className="text-sm opacity-80">
          Assegna i membri ai trainer e gestisci la relazione PT ⇄ Atleta.
        </p>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {/* Ricerca globale */}
      <div className={card}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs opacity-70">Cerca (nome, email, ruolo)</span>
            <input
              className={input}
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Digita per filtrare…"
            />
          </label>
        </div>
      </div>

      {/* BLOCCO TRAINER: assegna a me */}
      {isTrainer && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Assegna un membro a me</h2>
          <form onSubmit={assignToMe} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs opacity-70">Seleziona membro</span>
              <select
                className={select}
                value={assignToMeId}
                onChange={(e)=>setAssignToMeId(e.target.value)}
              >
                <option value="">— Scegli —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className={btnPrimary} disabled={busy || !assignToMeId}>
                {busy ? 'Assegno…' : 'Assegna'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BLOCCO OWNER: assegna trainer ⇄ member */}
      {isOwner && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Assegna membro a trainer</h2>
          <form onSubmit={ownerAssign} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs opacity-70">Trainer</span>
              <select className={select} value={selTrainer} onChange={(e)=>setSelTrainer(e.target.value)}>
                <option value="">— Scegli trainer —</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name ? `${t.full_name} (${t.email})` : t.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs opacity-70">Membro</span>
              <select className={select} value={selMember} onChange={(e)=>setSelMember(e.target.value)}>
                <option value="">— Scegli membro —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className={btnPrimary} disabled={busy || !selTrainer || !selMember}>
                {busy ? 'Assegno…' : 'Assegna'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* I TUOI CLIENTI (trainer) */}
      {isTrainer && (
        <div className={card}>
          <h2 className="text-base font-semibold mb-2">I miei clienti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {myClients.map(p => (
              <ListItem
                key={p.id}
                p={p}
                right={
                  <button
                    className={btnGhost}
                    onClick={()=>unlink(userId!, p.id)}
                  >
                    Rimuovi
                  </button>
                }
              />
            ))}
            {myClients.length === 0 && (
              <p className="text-sm opacity-70">Nessun cliente assegnato.</p>
            )}
          </div>
        </div>
      )}

      {/* RIEPILOGO OWNER: per trainer */}
      {isOwner && (
        <div className={card}>
          <h2 className="text-base font-semibold mb-2">Riepilogo per trainer</h2>
          <div className="space-y-3">
            {trainers.map(t => {
              const list = (groupedByTrainer[t.id] || []);
              return (
                <div key={t.id} className="border border-neutral-700 rounded p-3">
                  <div className="font-semibold mb-2">
                    {t.full_name || t.email} — {list.length} cliente{list.length!==1?'i':''}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {list.map(m => (
                      <ListItem
                        key={m.id}
                        p={m}
                        right={
                          <button
                            className={btnGhost}
                            onClick={()=>unlink(t.id, m.id)}
                          >
                            Rimuovi
                          </button>
                        }
                      />
                    ))}
                    {list.length === 0 && (
                      <p className="text-sm opacity-70">Nessun cliente assegnato.</p>
                    )}
                  </div>
                </div>
              );
            })}
            {trainers.length === 0 && (
              <p className="text-sm opacity-70">Nessun trainer presente.</p>
            )}
          </div>
        </div>
      )}

      {/* TUTTI (comodo per cercare) */}
      <div className={card}>
        <h2 className="text-base font-semibold mb-2">Tutti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(p => (
            <ListItem key={p.id} p={p} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm opacity-70">Nessun risultato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
