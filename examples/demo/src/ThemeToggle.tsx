'use client';

import { useEffect, useState } from 'react';

/** Toggles the `dark` class on <html> and remembers the choice in localStorage. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = (): void => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={
        className ||
        'rounded-lg border border-zinc-200 px-2 py-1 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900'
      }
    >
      {dark ? '☀' : '🌙'}
    </button>
  );
}
