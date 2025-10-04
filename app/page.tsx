// app/page.tsx (SERVER COMPONENT)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { routeForRole } from '@/lib/redirectAfterLogin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1) sessione utente
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2) prendo il ruolo dal profilo (fallback: member)
  let role: 'owner' | 'trainer' | 'member' = 'member';
  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (prof?.role === 'owner' || prof?.role === 'trainer' || prof?.role === 'member') {
    role = prof.role;
  }

  // 3) rotta in base al ruolo
  redirect(routeForRole(role));
}
