import type { ReactNode } from 'react';

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight">{children}</h2>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-base text-zinc-500">{children}</p>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="my-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</p>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.82em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
      {children}
    </code>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="my-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
      {children}
    </ul>
  );
}
