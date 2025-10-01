'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { input, btnPrimary } from '@/components/ui';

type Exercise = { id: string; name: string };

export default function ExerciseSelectOrCreate({
  value,
  onChange,
  label = 'Esercizio',
  allowCreate = true,
}: {
  value: string | null;                       // exercise_id o null
  onChange: (exerciseId: string) => void;     // restituisce SEMPRE un id
  label?: string;
  allowCreate?: boolean;
}) {
  const supabase = createClient();
  const [list, setList] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');     // testo Digitato
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.from('exercises').select('id, name').order('name', { ascending: true })
      .then(({ data }) => { setList((data ?? []) as Exercise[]); setLoading(false); });
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(e => e.name.toLowerCase().includes(q));
  }, [list, query]);

  const canCreate = allowCreate && query.trim().length > 1 && !filtered.some(e => e.name.toLowerCase() === query.trim().toLowerCase());

  const selectExisting = (id: string, label?: string) => {
    if (label) setQuery(label);
    onChange(id);
  };

  const createNew = async () => {
    if (!canCreate) return;
    setCreating(true);
    const name = query.trim();
    // prima prova a vedere se esiste "uguale"
    const { data: exists } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', name)
      .limit(1);
    if (exists && exists.length > 0) {
      selectExisting(exists[0].id, exists[0].name);
      setCreating(false);
      return;
    }
    // crea nuovo
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name })
      .select('id, name')
      .single();
    setCreating(false);
    if (error) return alert(error.message);
    if (data) {
      setList(prev => [...prev, data as Exercise].sort((a,b)=>a.name.localeCompare(b.name)));
      selectExisting(data.id, data.name);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm opacity-80">{label}</label>
      <input
        className={input + ' w-full'}
        placeholder="Digita o cerca… (es. Panca piana)"
        value={query}
        onChange={(e)=>setQuery(e.target.value)}
      />
      {!loading && (
        <>
          <div className="max-h-40 overflow-auto border border-neutral-700 rounded">
            {filtered.map(e => (
              <button
                key={e.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-neutral-800"
                onClick={()=>selectExisting(e.id, e.name)}
              >
                {e.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm opacity-70">Nessun esercizio trovato.</div>
            )}
          </div>
          {canCreate && (
            <button type="button" onClick={createNew} className={btnPrimary + ' mt-2'}>
              {creating ? 'Creo…' : `➕ Crea "${query.trim()}"`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
