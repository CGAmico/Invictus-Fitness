// app/api/admin/delete-user/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId as string | undefined;
    if (!userId) return NextResponse.json({ error: 'userId mancante' }, { status: 400 });

    if (!url || !anon) {
      return NextResponse.json(
        { error: 'CONFIG: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY mancanti' },
        { status: 500 }
      );
    }
    if (!service) {
      return NextResponse.json(
        { error: 'CONFIG: SUPABASE_SERVICE_ROLE_KEY mancante' },
        { status: 500 }
      );
    }

    // ⬇⬇ NOTE: await cookies() and only implement `get`
    const cookieStore = await cookies();
    const userClient = createServerClient(url, anon, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    // Utente chiamante
    const { data: { user }, error: getUserErr } = await userClient.auth.getUser();
    if (getUserErr || !user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    // Deve essere owner
    const { data: prof, error: profErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profErr || prof?.role !== 'owner') {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
    }

    // Admin client (service role) → elimina dall’Auth
    const admin = createAdminClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      return NextResponse.json({ error: `Auth delete fallito: ${delAuthErr.message}` }, { status: 500 });
    }

    // Soft-delete profilo (così scompare dalla lista)
    const { error: updErr } = await userClient
      .from('profiles')
      .update({ is_deleted: true, full_name: '(eliminato)' })
      .eq('id', userId);
    if (updErr) {
      return NextResponse.json({ error: `Aggiornamento profilo fallito: ${updErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore sconosciuto' }, { status: 500 });
  }
}
