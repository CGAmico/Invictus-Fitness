'use client';
import { redirect } from 'next/navigation';

export type Role = 'owner' | 'trainer' | 'member' | null;

export function routeForRole(role: Role): string {
  switch (role) {
    case 'owner':   return '/dashboard';
    case 'trainer': return '/trainer/clients';
    case 'member':  return '/programs';
    default:        return '/dashboard';
  }
}
