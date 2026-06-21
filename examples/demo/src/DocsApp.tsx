'use client';

import { useEffect, useState } from 'react';
import { WaveKitProvider } from '@wavekit-sdk/react';
import { PAGES } from './pages';
import { ThemeToggle } from './ThemeToggle';
import { waveKit } from './wavekit';

const FIRST_PAGE = PAGES[0]?.id ?? 'overview';

export function DocsApp() {
  const [pageId, setPageId] = useState<string>(FIRST_PAGE);

  // Hash-based routing so each page is linkable (e.g. #quick-start).
  useEffect(() => {
    const sync = (): void => setPageId(window.location.hash.slice(1) || FIRST_PAGE);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];

  return (
    <WaveKitProvider client={waveKit}>
      <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto flex max-w-5xl">
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 p-4 dark:border-zinc-800 sm:flex">
            <div className="mb-5 flex items-center justify-between">
              <a href="/" className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70">
                WaveKit
              </a>
              <ThemeToggle />
            </div>
            <nav className="flex flex-col gap-0.5">
              {PAGES.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  className={
                    p.id === page?.id
                      ? 'rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium dark:bg-zinc-800'
                      : 'rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }
                >
                  {p.title}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-1.5 pt-4 text-xs">
              <a href="/dashboard" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200">
                Dashboard ↗
              </a>
              <span className="text-zinc-400">XRPL wallet connector</span>
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-6 py-10">
            {/* Mobile page picker (sidebar is hidden on small screens). */}
            <div className="mb-8 sm:hidden">
              <select
                value={page?.id}
                onChange={(e) => {
                  window.location.hash = e.target.value;
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {PAGES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="mx-auto max-w-2xl pb-20">{page?.element}</div>
          </main>
        </div>
      </div>
    </WaveKitProvider>
  );
}
