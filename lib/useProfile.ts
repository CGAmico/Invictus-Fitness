'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Role = 'owner' | 'trainer' | 'member' | null;

export function useProfile() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setUserId(null);
          setRole(null);
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('role, gender, birth_date, height_cm, weight_kg')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (error) {
          console.error('useProfile select error:', error.message);
          setRole(null);
          setNeedsOnboarding(false);
        } else if (data) {
          const r = (data.role ?? null) as Role;
          setRole(r);
          setNeedsOnboarding(!data.gender || !data.birth_date || !data.height_cm || !data.weight_kg);
        } else {
          setRole(null);
          setNeedsOnboarding(true);
        }
      } catch (e) {
        console.error('useProfile fatal:', e);
        setRole(null);
        setNeedsOnboarding(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // aggiorna quando cambia sessione (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      load();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const isOwner = role === 'owner';
  const isTrainer = role === 'trainer';
  const isMember = role === 'member';

  return { loading, userId, role, isOwner, isTrainer, isMember, needsOnboarding };
}
