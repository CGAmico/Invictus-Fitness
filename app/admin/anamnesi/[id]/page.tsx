'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '../../../../lib/supabaseClient';
import { useProfile } from '../../../../lib/useProfile';
import { card, input, btnPrimary, btnGhost, select } from '../../../../components/ui';

type AData = {
  goal?: string;
  injuries?: string;
  surgeries?: string;
  joint_issues?: string;
  pain_now?: string;
  medications?: string;
  pathologies?: string;
  contraindications?: string;
  training_age?: string;
  notes?: string;
  consent?: boolean;
};

export default function AdminAnamnesiForUserPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const userId = params?.id as string;
  const { isOwner, isTrainer } = useProfile();

  const [form, setForm] = useState<AData>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState<string>('utente');

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setMsg(null);

      // Nome utente
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      setUserLabel(prof?.full_name || prof?.email || 'utente');

      // Anamnesi
      const { data, error } = await supabase
        .from('anamnesis')
        .select('data, consent')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) { setMsg(error.message); return; }
      if (data) {
        setForm({
          ...(data.data || {}),
          consent: data.consent ?? false,
        });
      } else {
        setForm({});
      }
    };
    load();
    // eslint-disable-next-line
  }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner && !isTrainer) { setMsg('Permesso negato'); return; }

    setBusy(true); setMsg(null);
    const payload = {
      user_id: userId,
      data: {
        goal: form.goal || '',
        injuries: form.injuries || '',
        surgeries: form.surgeries || '',
        joint_issues: form.joint_issues || '',
        pain_now: form.pain_now || '',
        medications: form.medications || '',
        pathologies: form.pathologies || '',
        contraindications: form.contraindications || '',
        training_age: form.training_age || '',
        notes: form.notes || '',
        consent: !!form.consent,
      },
      consent: !!form.consent,
    };
    const { error } = await supabase
      .from('anamnesis')
      .upsert(payload, { onConflict: 'user_id' });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg('Anamnesi aggiornata.');
  };

  const Field = ({
    label, name, textarea=false, placeholder,
  }: { label: string; name: keyof AData; textarea?: boolean; placeholder?: string }) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs opacity-70">{label}</span>
      {textarea ? (
        <textarea
          className={input + ' min-h-[90px]'}
          value={(form[name] as string) || ''}
          onChange={(e)=>setForm(prev => ({ ...prev, [name]: e.target.value }))}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={input}
          value={(form[name] as string) || ''}
          onChange={(e)=>setForm(prev => ({ ...prev, [name]: e.target.value }))}
          placeholder={placeholder}
        />
      )}
    </label>
  );

  return (
    <div className="space-y-6">
      <div className={card}>
        <h1 className="text-2xl font-bold">Anamnesi — {userLabel}</h1>
        <p className="text-sm opacity-80">Modifica a cura dello staff.</p>
      </div>

      {msg && <div className={card + ' border border-neutral-700'}>{msg}</div>}

      <form onSubmit={save} className={card + ' space-y-3'}>
        <Field label="Obiettivo" name="goal" placeholder="Es: ricomposizione, forza, riabilitazione…" />
        <Field label="Infortuni/traumi pregressi" name="injuries" textarea />
        <Field label="Interventi chirurgici" name="surgeries" textarea />
        <Field label="Problemi articolari" name="joint_issues" textarea />
        <Field label="Dolori attuali" name="pain_now" textarea />
        <Field label="Farmaci in corso" name="medications" textarea />
        <Field label="Patologie note" name="pathologies" textarea />
        <Field label="Controindicazioni certificate" name="contraindications" textarea />
        <Field label="Esperienza d’allenamento" name="training_age" />
        <Field label="Note libere" name="notes" textarea />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.consent}
            onChange={(e)=>setForm(prev => ({ ...prev, consent: e.target.checked }))}
          />
          <span className="text-sm">Consenso informato</span>
        </label>

        <button className={btnPrimary} disabled={busy}>
          {busy ? 'Salvataggio…' : 'Salva'}
        </button>
      </form>
    </div>
  );
}
