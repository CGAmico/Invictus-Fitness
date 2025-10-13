// app/admin/users/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

export async function deleteUserAction(userId: string) {
  if (!SERVICE_ROLE) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE on server.');
  }

  // client admin con service role: bypassa RLS
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // opzionale: pulizie tabelle “figlie” se non hai CASCADE ovunque
  // await admin.from('programs').delete().eq('user_id', userId);
  // await admin.from('sessions').delete().eq('user_id', userId);
  // ...aggiungi qui se servono

  // elimina utente da Auth (se esiste). Questo, con CASCADE su profiles, rimuove anche il profilo.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  // se per qualche motivo il profilo fosse rimasto, kill di sicurezza:
  await admin.from('profiles').delete().eq('id', userId);

  // aggiorna la lista
  revalidatePath('/admin/users');

  return { ok: true };
}
