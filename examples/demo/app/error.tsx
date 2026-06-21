'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-white p-6 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div>
        <p className="text-sm font-medium text-red-500">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">An unexpected error occurred</h1>
        <p className="mt-2 text-sm text-zinc-500">Try again, or head back to the home page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#3052FF' }}
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
