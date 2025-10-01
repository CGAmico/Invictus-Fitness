'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="px-3 py-1.5 rounded border border-neutral-600 hover:bg-neutral-800 text-white sm:text-sm"
      title={isDark ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
