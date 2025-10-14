'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabaseClient';
import { useProfile } from '../../../lib/useProfile';
import { card, input, select, btnPrimary, btnGhost } from '../../../components/ui';

type Role = 'owner'|'trainer'|'member';
type Profile = { id: string; full_name: string|null; email: string|null; role: Role; is_deleted: boolean };

export default function AdminUsersPage() {
  const supabase = createClient();
  const { isOwner } = useProfile();

  const [people, setPeople] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form creazione utente
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [noteAnamnesi, setNoteAnamnesi] = useState('');

  const load = async () => {
    setMsg(null);

    // Carica SOLO i profili non eliminati
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_deleted')
      .eq('is_deleted', false)  //<-- mostra solo NON eliminati
      .order('full_name', { ascending: true });

    if (error) { setMsg(error.message); return; }
    setPeople((data ?? []) as Profile[]);
  };

  const deleteUser = async (userId: string) => {
  if (!confirm('Eliminare definitivamente questo utente?')) return;
  setBusy(true); setMsg(null);
  try {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Errore eliminazione');
    await load(); // <-- ricarica SOLO i non eliminati
  } catch (e: any) {
    setMsg(e.message);
  } finally {
    setBusy(false);
  }
};

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isOwner]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(p =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  }, [people, search]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (!email || !password) { setMsg('Email e password sono obbligatorie'); return; }

    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          anamnesis: noteAnamnesi ? { notes: noteAnamnesi } : null,
          emailConfirm: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore creazione utente');

      setEmail(''); setPassword(''); setFullName(''); setRole('member'); setNoteAnamnesi('');
      setMsg('Utente creato con successo.');
      await load();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ⬇️ Nuovo: cancellazione definitiva
  const hardDeleteUser = async (userId: string) => {
    if (!confirm('Eliminare definitivamente questo utente? L’operazione è irreversibile.')) return;

    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Errore eliminazione utente');

      // Ricarica la lista filtrata (sparisce subito)
      await load();
      setMsg('Utente eliminato definitivamente.');
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Utenti</h1>
        <p className="text-sm opacity-80">Crea nuovi iscritti, assegna ruoli e apri l’anamnesi.</p>
        <div className="text-xs mt-2 opacity-70">ruolo corrente: {isOwner ? 'owner' : 'non-owner'}</div>
      </div>

      {msg && <div className={card + ' border border-red-500 text-red-300'}>{msg}</div>}

      {isOwner && (
        <div className={card}>
          <h2 className="text-lg font-semibold mb-3">Crea nuovo iscritto</h2>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Email</span>
              <input className={input} value={email} onChange={(e)=>setEmail(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Password iniziale</span>
              <input type="password" className={input} value={password} onChange={(e)=>setPassword(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Nome completo</span>
              <input className={input} value={fullName} onChange={(e)=>setFullName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-70">Ruolo</span>
              <select className={select} value={role} onChange={(e)=>setRole(e.target.value as Role)}>
                <option value="member">member</option>
                <option value="trainer">trainer</option>
                <option value="owner">owner</option>
              </select>
            </label>

            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs opacity-70">Anamnesi (note iniziali, opz.)</span>
              <textarea className={input + ' min-h-[80px]'} value={noteAnamnesi} onChange={(e)=>setNoteAnamnesi(e.target.value)} />
            </label>

            <div className="md:col-span-2 flex items-end">
              <button className={btnPrimary} disabled={busy}>
                {busy ? 'Creo…' : 'Crea iscritto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={card}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs opacity-70">Cerca</span>
            <input className={input} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Nome, email, ruolo…" />
          </label>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-base font-semibold mb-2">Tutti gli utenti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(p => (
            <div key={p.id} className="border border-neutral-700 rounded px-3 py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.full_name || '—'}</div>
                <div className="text-xs opacity-70">
                  {p.email || '—'} • ruolo: {p.role}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/admin/anamnesi/${p.id}`} className={btnGhost}>Anamnesi</a>
                <button
                  className={btnGhost + ' text-red-300 border-red-500/50 hover:border-red-400'}
                  onClick={() => deleteUser(p.id)}
                  disabled={busy || !isOwner}
                  title={isOwner ? 'Elimina definitivamente' : 'Solo gli owner possono eliminare'}
                >
                  Elimina 
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm opacity-70">Nessun risultato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
