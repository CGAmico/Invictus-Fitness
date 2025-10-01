'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function Dashboard() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    location.href = '/';
  };

  return (
    <main className="p-6 border rounded-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-neutral-600">Sei loggato come {email ?? 'ospite'}</p>
      </div>
      <div className="flex gap-3">
        <Link href="/exercises" className="px-4 py-2 rounded bg-black text-white">Esercizi</Link>
        <Link href="/programs" className="px-4 py-2 rounded bg-black text-white">Programmi</Link>
        <button onClick={signOut} className="px-4 py-2 rounded bg-neutral-200 text-black">Esci</button>
      </div>
    </main>
  );
}
