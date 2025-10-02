// app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Evita prerender in build e forza runtime server
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email,
      password,
      full_name = '',
      role = 'member',          // 'member' | 'trainer' | 'owner'
      profile = {},             // { gender, birth_date, height_cm, weight_kg } opzionale
      anamnesis = null,         // oggetto opzionale per anamnesi
      emailConfirm = true,      // se true: utente confermato subito
      sendInvite = false,       // se true e !emailConfirm: invia email invito
    } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'email e password sono obbligatori' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // accettiamo entrambe le varianti per compatibilità
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Server non configurato (mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    // Istanzia il client **a runtime** (non a import-time)
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Crea utente auth
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: !!emailConfirm,
      user_metadata: { full_name, role },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Creazione utente riuscita ma manca userId' }, { status: 500 });
    }

    // 2) Upsert profilo (il trigger lo crea comunque; qui forziamo/aggiorniamo)
    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      email,
      full_name: full_name || null,
      role, // forza il ruolo desiderato
      // campi opzionali del profilo
      gender: (profile as any).gender ?? null,
      birth_date: (profile as any).birth_date ?? null,
      height_cm: (profile as any).height_cm ?? null,
      weight_kg: (profile as any).weight_kg ?? null,
    });
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    // 3) (Opzionale) Anamnesi iniziale
    if (anamnesis && typeof anamnesis === 'object') {
      const a = anamnesis as Record<string, any>;
      const { error: aErr } = await admin
        .from('anamnesis')
        .upsert(
          {
            user_id: userId,
            data: a,
            consent: !!a.consent,
            signed_at: a.consent ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id' }
        );
      if (aErr) {
        return NextResponse.json({ error: aErr.message }, { status: 400 });
      }
    }

    // 4) (Opzionale) invia link d’invito (se non confermi subito l’email)
    if (sendInvite && !emailConfirm) {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`;
      const { error: linkErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo } as any);
      if (linkErr) {
        // non rendiamo fallita la creazione: logghiamo e proseguiamo
        console.warn('Invite link error:', linkErr.message);
      }
    }

    return NextResponse.json({ ok: true, userId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
