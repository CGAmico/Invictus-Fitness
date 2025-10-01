import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;

// ATTENZIONE: questa route gira SOLO sul server (edge/node), non esporta mai la service key al client
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      full_name = '',
      role = 'member',               // 'member' | 'trainer' | 'owner'
      profile = {},                  // dati profilo opzionali: gender, birth_date, height_cm, weight_kg
      anamnesis = null,              // oggetto JSON opzionale per anamnesi
      emailConfirm = true,           // se true: l'utente è subito confermato (usa la password impostata)
      sendInvite = false,            // in alternativa, invia mail di invito/reset link
    } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'email e password sono obbligatori' }, { status: 400 });
    }

    // 1) Crea utente auth con ruolo e nome nei metadati (attiva direttamente se emailConfirm)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: !!emailConfirm,
      user_metadata: { full_name, role },
    });
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

    const userId = created.user?.id;
    if (!userId) return NextResponse.json({ error: 'Creazione utente riuscita ma manca userId' }, { status: 500 });

    // 2) Aggiorna profilo (il trigger dovrebbe aver creato la riga; in ogni caso upsert)
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: full_name || null,
        role,   // forza il ruolo desiderato
        gender: profile.gender ?? null,
        birth_date: profile.birth_date ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
      });
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 });

    // 3) (Opzionale) Anamnesi iniziale
    if (anamnesis && typeof anamnesis === 'object') {
      const { error: aErr } = await admin
        .from('anamnesis')
        .upsert({
          user_id: userId,
          data: anamnesis,
          consent: !!anamnesis.consent,
          signed_at: anamnesis.consent ? new Date().toISOString() : null,
        }, { onConflict: 'user_id' });
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });
    }

    // 4) (Opzionale) invia link d’invito se richiesto
    if (sendInvite && !emailConfirm) {
      // genera link di invito (reset password) per far impostare la password
      const { error: linkErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`,
      } as any);
      if (linkErr) {
        // non consideriamo blocking error: l'utente è già creato
        console.warn('Invite link error:', linkErr.message);
      }
    }

    return NextResponse.json({ ok: true, userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore server' }, { status: 500 });
  }
}
