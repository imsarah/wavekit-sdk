# Contributing to WaveKit

Thanks for your interest in WaveKit! This is an **npm workspaces** monorepo — use
`npm` (not pnpm/yarn).

## Setup

```bash
npm install        # installs every package + the demo, and links them together
npm run dev        # build the libraries, then run the demo at http://localhost:3000
```

## Before you open a PR

Always run the full check — CI runs the same three commands:

```bash
npm run typecheck   # tsc --noEmit across the workspace
npm run build       # tsc -b project references -> dist/
npm test            # node:test (drops, store, client, payments, adapters, webhooks)
```

If you changed the demo, also build it (Next.js type-checks on build):

```bash
npm run build --workspace wavekit-demo
```

## Conventions

- **The `@wavekit-sdk/core` package has zero runtime dependencies — keep it that way.**
  Wallet/XRPL SDKs are *optional peer dependencies*, lazy-loaded by the adapters via
  dynamic `import()`. Add an ambient `declare module` stub in the adapter's
  `src/externals.d.ts` so it type-checks while the SDK is uninstalled.
- Workspace dependencies use `"*"` (npm can't resolve `workspace:*`).
- Keep changes small and focused; add tests for new core logic.

## Adding a wallet adapter

Each wallet is one small package under `packages/` that implements the
`XRPLWalletAdapter` interface from `@wavekit-sdk/core` (`connect`, `disconnect`,
`signTransaction`, `on`). Use an existing adapter (e.g. `adapter-walletconnect`) as a
template, and add a mock to the demo playground so it shows up in `<ConnectModal />`.

## Reporting issues

Please include the package and version, your environment (Node version, framework), and
a minimal reproduction where possible.
