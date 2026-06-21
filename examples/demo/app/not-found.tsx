import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-white p-6 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div>
        <p className="text-sm font-semibold" style={{ color: '#3052FF' }}>404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">That page doesn’t exist.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#3052FF' }}
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
