// app/page.tsx
import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { routeForRole } from '@/lib/redirectAfterLogin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // In Next 15 il tipo di ritorno di .get può variare → usiamo 'any' e normalizziamo
  const cookieStore: any = nextCookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // deve restituire: string | undefined
        get(name: string) {
          const c = cookieStore.get(name);
          return typeof c === 'string' ? c : c?.value;
        },
        // in home non scriviamo cookie
        set() {},
        remove() {},
      },
    }
  );

  // 1) utente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2) ruolo
  let role: 'owner' | 'trainer' | 'member' = 'member';
  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (prof?.role === 'owner' || prof?.role === 'trainer' || prof?.role === 'member') {
    role = prof.role;
  }

  // 3) reindirizza in base al ruolo
  redirect(routeForRole(role));
}
