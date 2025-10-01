'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
import { card, input, select, btnPrimary } from '@/components/ui';

type AData = {
  goal?: string;                 // obiettivo
  injuries?: string;             // infortuni/traumi pregressi
  surgeries?: string;            // interventi chirurgici
  joint_issues?: string;         // problemi articolari (ginocchia/spalle/schiena...)
  pain_now?: string;             // dolori attuali
  medications?: string;          // farmaci in corso
  pathologies?: string;          // patologie note
  contraindications?: string;    // controindicazioni certificate
  training_age?: string;         // esperienza (principiante/intermedio/avanzato/anni)
  notes?: string;                // note libere
  consent?: boolean;             // consenso info
};

type Row = {
  id: string;
  user_id: string;
  data: AData;
  consent: boolean | null;
  signed_at: string | null;
  updated_at: string | null;
};

export default function AnamnesiPage() {
  const supabase = createClient();
  const { userId, role } = useProfile();

  const [row, setRow] = useState<Row | null>(null);
  const [form, setForm] = useState<AData>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!userId) return;
    setMsg(null);
    // recupera la tua anamnesi (una riga per utente)
    const { data, error } = await supabase
      .from('anamnesis')
      .select('id, user_id, data, consent, signed_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) { setMsg(error.message); return; }

    if (data) {
      setRow(data as any);
      setForm({
        ...((data as any).data || {}),
        consent: (data as any).consent ?? false,
      });
    } else {
      setRow(null);
      setForm({});
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
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
      // Se vuoi tracciare la "firma" alla prima spunta:
      signed_at: (form.consent && !row?.signed_at) ? new Date().toISOString() : row?.signed_at ?? null,
    };

    // upsert (grazie a unique index su user_id)
    const { error } = await supabase
      .from('anamnesis')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) { setMsg(error.message); setBusy(false); return; }
    setBusy(false);
    setMsg('Anamnesi salvata.');
    await load();
  };

  const Field = ({
    label, name, placeholder, textarea=false,
  }: { label: string; name: keyof AData; placeholder?: string; textarea?: boolean }) => (
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
        <h1 className="text-2xl font-bold">Anamnesi</h1>
        <p className="text-sm opacity-80">
          Compila o aggiorna la tua scheda personale. I dati sono visibili a te e allo staff autorizzato.
        </p>
      </div>

      {msg && <div className={card + ' border border-neutral-700'}>{msg}</div>}

      <form onSubmit={save} className={card + ' space-y-3'}>
        <Field label="Obiettivo" name="goal" placeholder="Es: ricomposizione corporea, forza, salute generale…" />
        <Field label="Infortuni/traumi pregressi" name="injuries" placeholder="Descrizione di eventuali infortuni" textarea />
        <Field label="Interventi chirurgici" name="surgeries" placeholder="Eventuali interventi e anno" textarea />
        <Field label="Problemi articolari" name="joint_issues" placeholder="Es: spalla, ginocchio, schiena…" textarea />
        <Field label="Dolori attuali" name="pain_now" placeholder="Se presenti, dove e quando" textarea />
        <Field label="Farmaci in corso" name="medications" placeholder="Elenco, dosi (se desideri indicarle)" textarea />
        <Field label="Patologie note" name="pathologies" placeholder="Es: ipertensione, diabete (se vuoi indicarle)" textarea />
        <Field label="Controindicazioni certificate" name="contraindications" placeholder="Se presenti" textarea />
        <Field label="Esperienza d’allenamento" name="training_age" placeholder="Principiante / Intermedio / Avanzato o anni di pratica" />
        <Field label="Note libere" name="notes" placeholder="Qualsiasi altra informazione utile" textarea />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.consent}
            onChange={(e)=>setForm(prev => ({ ...prev, consent: e.target.checked }))}
          />
          <span className="text-sm">Confermo di aver fornito informazioni veritiere e di aver compreso le indicazioni di sicurezza.</span>
        </label>

        <div className="flex items-center justify-between text-xs opacity-70">
          <span>Ultimo aggiornamento: {row?.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</span>
          <span>Firma: {row?.signed_at ? new Date(row.signed_at).toLocaleDateString() : (form.consent ? 'applicherà alla prima spunta' : '—')}</span>
        </div>

        <div>
          <button className={btnPrimary} disabled={busy}>
            {busy ? 'Salvataggio…' : 'Salva anamnesi'}
          </button>
        </div>
      </form>
    </div>
  );
}
