// Design tokens -> classi Tailwind riusabili

export const card =
  'bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]';

export const input =
  'w-full px-3 py-2 rounded-md bg-[#0c0c0c] border border-[#262626] text-[var(--foreground)] ' +
  'placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none';

export const select = input;

export const btnPrimary =
  'inline-flex items-center justify-center px-3 py-2 rounded-md ' +
  'bg-[var(--brand)] text-white font-medium ' +
  'hover:bg-[var(--brand-400)] active:bg-[var(--brand-600)] ' +
  'disabled:opacity-60 disabled:pointer-events-none transition';

export const btnGhost =
  'inline-flex items-center justify-center px-3 py-2 rounded-md ' +
  'bg-transparent border border-[#303030] text-white ' +
  'hover:bg-[#121212] active:bg-[#0e0e0e] transition';

export const badge =
  'inline-flex items-center gap-1 rounded-full text-xs px-2 py-1 ' +
  'bg-[var(--brand-600)]/30 border border-[var(--brand-600)] text-[var(--foreground)]';
