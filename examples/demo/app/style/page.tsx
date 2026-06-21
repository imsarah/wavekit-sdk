'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * WaveKit style guide (/style) — a single, self-contained page showing the theme:
 * colour tokens, typography, components, radii and shadows, in light + dark.
 * Neutral-first with one indigo accent (#3052FF); class-based dark mode.
 */
const ACCENT = '#3052FF';

const brand: ReadonlyArray<readonly [string, string]> = [
  ['primary-50', '#EEF1FF'],
  ['primary-100', '#DCE3FF'],
  ['primary-400', '#5A74FF'],
  ['primary-500', '#3052FF'],
  ['primary-600', '#2440E6'],
  ['primary-700', '#1B30B4'],
  ['violet-500', '#6B3CFF'],
];

const neutrals: ReadonlyArray<readonly [string, string]> = [
  ['zinc-50', '#FAFAFA'],
  ['zinc-100', '#F4F4F5'],
  ['zinc-200', '#E4E4E7'],
  ['zinc-300', '#D4D4D8'],
  ['zinc-400', '#A1A1AA'],
  ['zinc-500', '#71717A'],
  ['zinc-600', '#52525B'],
  ['zinc-700', '#3F3F46'],
  ['zinc-800', '#27272A'],
  ['zinc-900', '#18181B'],
  ['zinc-950', '#09090B'],
];

const statuses: ReadonlyArray<readonly [string, string, string]> = [
  ['success', '#047857', '#D1FAE5'],
  ['warning', '#B45309', '#FFFBEB'],
  ['error', '#B91C1C', '#FEF2F2'],
  ['info', '#0369A1', '#E0F2FE'],
];

const typeScale: ReadonlyArray<readonly [string, string, string]> = [
  ['text-xs', 'text-xs', '12'],
  ['text-sm', 'text-sm', '14'],
  ['text-base', 'text-base', '16'],
  ['text-lg', 'text-lg', '18'],
  ['text-xl', 'text-xl', '20'],
  ['text-2xl', 'text-2xl', '24'],
  ['text-3xl', 'text-3xl', '30'],
  ['text-4xl', 'text-4xl', '36'],
];

const radii: ReadonlyArray<readonly [string, string]> = [
  ['rounded-lg', '8'],
  ['rounded-xl', '12'],
  ['rounded-2xl', '16'],
  ['rounded-3xl', '24'],
  ['rounded-full', '∞'],
];

const shadows: ReadonlyArray<string> = ['shadow-sm', 'shadow', 'shadow-md', 'shadow-xl', 'shadow-2xl'];

function useDarkToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
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
  return { dark, toggle };
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-200 py-10 dark:border-zinc-800">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-16 rounded-xl ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10"
        style={{ backgroundColor: hex }}
      />
      <div className="text-xs font-medium">{name}</div>
      <div className="font-mono text-[11px] uppercase text-zinc-400">{hex}</div>
    </div>
  );
}

export default function StyleGuide() {
  const { dark, toggle } = useDarkToggle();

  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              W
            </span>
            <span className="text-lg font-semibold tracking-tight">WaveKit — Style Guide</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
              ← Home
            </a>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              {dark ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="py-10">
          <h1 className="text-3xl font-bold tracking-tight">Design tokens &amp; components</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Neutral-first, one indigo accent ({ACCENT}). Class-based dark mode — toggle top-right to
            review both themes.
          </p>
        </div>

        <Section title="Brand &amp; accent" desc="Primary scale + the violet gradient partner (hero / CTA only).">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
            {brand.map(([n, h]) => (
              <Swatch key={n} name={n} hex={h} />
            ))}
          </div>
          <div
            className="mt-6 flex h-20 items-center justify-center rounded-2xl text-sm font-medium text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #6B3CFF)` }}
          >
            linear-gradient(135deg, #3052FF, #6B3CFF)
          </div>
        </Section>

        <Section title="Neutrals (zinc)" desc="Backgrounds, borders and text levels.">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 md:grid-cols-11">
            {neutrals.map(([n, h]) => (
              <Swatch key={n} name={n} hex={h} />
            ))}
          </div>
        </Section>

        <Section title="Status" desc="Foreground on a tint; always pair colour with text/icon.">
          <div className="flex flex-wrap gap-3">
            {statuses.map(([n, fg, bg]) => (
              <span
                key={n}
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{ color: fg, backgroundColor: bg }}
              >
                {n}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Surfaces" desc="Current-mode tokens — toggle the theme to compare light vs dark.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-medium">surface</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">card background</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">surface-inset</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">nested panel</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="text-sm font-medium">border</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">zinc-200 / zinc-800</div>
            </div>
          </div>
        </Section>

        <Section title="Typography" desc="System sans; tight tracking on headings.">
          <div className="space-y-3">
            {typeScale.map(([label, cls, px]) => (
              <div key={label} className="flex items-baseline gap-4">
                <span className="w-28 shrink-0 font-mono text-[11px] text-zinc-400">
                  {label} · {px}px
                </span>
                <span className={`${cls} font-semibold tracking-tight`}>Connect any XRPL wallet</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-6 pt-2 text-sm">
              <span className="font-normal">Regular 400</span>
              <span className="font-medium">Medium 500</span>
              <span className="font-semibold">Semibold 600</span>
              <span className="font-bold">Bold 700</span>
            </div>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              Primary
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Secondary
            </button>
            <button
              type="button"
              disabled
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              Disabled
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Small
            </button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-md gap-3">
            <input
              placeholder="Text input"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-700"
            />
            <select className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <option>Select a wallet…</option>
              <option>Xaman</option>
              <option>Ledger</option>
            </select>
          </div>
        </Section>

        <Section title="Radii">
          <div className="flex flex-wrap gap-4">
            {radii.map(([cls, px]) => (
              <div key={cls} className="flex flex-col items-center gap-1.5">
                <div className={`h-16 w-16 border border-zinc-200 bg-zinc-100 ${cls} dark:border-zinc-700 dark:bg-zinc-800`} />
                <span className="font-mono text-[11px] text-zinc-400">{px}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Shadows">
          <div className="flex flex-wrap gap-6">
            {shadows.map((cls) => (
              <div key={cls} className="flex flex-col items-center gap-2">
                <div className={`h-16 w-24 rounded-xl border border-zinc-100 bg-white ${cls} dark:border-zinc-800 dark:bg-zinc-900`} />
                <span className="font-mono text-[11px] text-zinc-400">{cls}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Composed: checkout card" desc="The tokens applied together.">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold">Pay with XRP</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Paid
              </span>
            </div>
            <div className="space-y-3 px-4 py-5">
              <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-950">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Amount</span>
                  <span>25 XRP</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Fee (0.2%)</span>
                  <span>0.05 XRP</span>
                </div>
                <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>25.05 XRP</span>
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Pay with wallet
              </button>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
