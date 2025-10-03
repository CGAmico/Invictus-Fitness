// app/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic'; // evita prerendering/caching della home

export default async function Home() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {}, // non scriviamo cookie dalla home
        remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // non loggato → /login, loggato → /app
  redirect(user ? '/app' : '/login');
}
