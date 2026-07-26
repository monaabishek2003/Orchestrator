# Build & Publish Pipeline

How `apps/web` (Next.js) and `apps/server` (Express) are turned into the single
npm package `orchestrator-sdk`, and how that package boots at runtime.

## The pieces

- `apps/web` — a Next.js app built with `output: "export"` (see
  `apps/web/next.config.js`), so `next build` emits a fully static site into
  `apps/web/out/` (plain HTML/JS/CSS, no Node server required to serve it).
- `apps/server` — an Express + Socket.IO app compiled with `tsup`
  (`apps/server/tsup.config.ts`). It has two entry points:
  - `src/index.ts` — library entry (`dist/index.js`)
  - `src/cli.ts` — the CLI entry, built with a `#!/usr/bin/env node` banner
    and published as the `orchestrator` bin (`dist/cli.js`)
- `packages/*` — shared workspace packages consumed by both apps.

Both apps live in a pnpm workspace (`pnpm-workspace.yaml`) and are wired
together by the scripts in `scripts/`.

## Build steps (`pnpm build`)

Defined in the root `package.json`:

```
pnpm --filter @orchestrator/web build      # next build → apps/web/out/
pnpm --filter @orchestrator/server build   # prisma generate && tsup → apps/server/dist/
node scripts/assemble-dist.js              # merge everything into root dist/
```

### 1. Web build
`next build` with static export produces `apps/web/out/index.html` and assets.

### 2. Server build
`prisma generate` regenerates the Prisma client, then `tsup` bundles
`src/index.ts` and `src/cli.ts` into `apps/server/dist/` as ESM for Node 20.

#### How `cli.js` is compiled (detail)

`apps/server/package.json`'s `build` script runs `prisma generate && tsup`,
in that order — the Prisma client must exist first because `cli.ts`
transitively imports Prisma-backed modules (`db.ts`). tsup then bundles
`src/cli.ts`, along with everything it imports (`db.ts`, `git.ts`,
`server.ts`, `services/process-registry.js`, etc.), into a single output file.

Configured in `apps/server/tsup.config.ts`:

```js
export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
});
```

- `entry` — two entry points compiled in the same tsup run: `src/index.ts`
  (the library export) and `src/cli.ts` (the CLI), each bundled to its own
  file in `outDir`.
- `format: ["esm"]` / `target: "node20"` — output is ESM JavaScript targeting
  Node 20 (matches the `engines.node >=20.11.0` constraint in the root
  `package.json`).
- `clean: true` — wipes `apps/server/dist/` before each build so stale files
  don't leak into the next one.
- `sourcemap: true` — emits `.js.map` files alongside each output for
  readable stack traces.
- `banner: { js: "#!/usr/bin/env node" }` — prepends this shebang line to the
  top of every emitted JS file, including `cli.js`. This is what makes
  `dist/cli.js` directly executable as a shell script rather than requiring
  `node dist/cli.js`.

The shebang, combined with the root `package.json`'s `bin.orchestrator ->
./dist/cli.js` field (which npm uses to symlink an executable into
`node_modules/.bin` / the global bin directory on install), is what makes
`orchestrator` runnable as a plain command after `npm install`.

The compiled `apps/server/dist/cli.js` is copied unmodified into the
repo-root `dist/cli.js` by `scripts/assemble-dist.js` (below) — no
recompilation happens at that step. `scripts/verify-dist.js` then asserts
both that `dist/cli.js` exists and that it starts with the shebang, as a
safety net before publishing.

### 3. Assemble (`scripts/assemble-dist.js`)
Copies the build outputs into one publishable `dist/` at the repo root:

| Source | Destination |
|---|---|
| `apps/server/dist/` | `dist/` (includes `cli.js`, `index.js`, etc.) |
| `apps/web/out/` | `dist/web/` (static site, served by the Express app) |
| `apps/server/prisma/migrations/` | `dist/prisma/migrations/` |
| `apps/server/prisma/schema.prisma` | `dist/prisma/schema.prisma` |

The root `dist/` is what actually gets published to npm — `package.json`'s
`files` field only whitelists `dist` and `scripts/postinstall.js`.

## Verification (`scripts/verify-dist.js`)

Runs as part of `prepublishOnly` (`pnpm build && node scripts/verify-dist.js`)
and checks that the assembled `dist/` is publishable:

- `dist/cli.js` exists and starts with the `#!/usr/bin/env node` shebang
- `dist/web/index.html` exists (the static site made it in)
- `dist/prisma/migrations/` exists and is non-empty
- `dist/prisma/schema.prisma` exists

If any check fails, publishing is aborted.

## Runtime: how the server finds the web build and the database

`apps/server/src/server.ts` decides "am I running from source or from the
published package?" purely by checking whether `dist/web/` exists next to the
compiled module — no `NODE_ENV` flag needed:

- **Production** (installed package): `dist/web/` exists →
  `express.static()` serves the static Next.js export directly, and CORS is
  disabled since everything is same-origin on `http://localhost:8000`.
- **Development**: `dist/web/` doesn't exist → the server assumes the Next.js
  dev server is running separately on `:3000` and enables CORS for it instead.

`apps/server/src/db.ts` resolves the Prisma schema path the same way (checks
for `dist/prisma/schema.prisma` next to the compiled module, falls back to
the source-tree path), and stores the SQLite database in `~/.orchestrator/data.db`.

## Publish steps

1. `npm publish` triggers `prepublishOnly`, which runs `pnpm build` (web +
   server + assemble) and then `verify-dist.js`.
2. Only `dist/` and `scripts/postinstall.js` are packed into the tarball
   (per the `files` field in `package.json`).
3. On `npm install`, `postinstall` (`scripts/postinstall.js`) runs
   `prisma generate --schema dist/prisma/schema.prisma` against the installed
   package so the Prisma client matches the consumer's platform. It's a
   no-op (exits 0) if `dist/` isn't there yet — e.g. during local monorepo
   dev before the first build.

## Running the published CLI

`bin.orchestrator` points at `dist/cli.js`, which on execution:

1. Runs a git preflight check.
2. Ensures `~/.orchestrator` exists and applies Prisma migrations
   (`prisma migrate deploy`).
3. Starts the Express/Socket.IO server on port 8000, which serves the bundled
   static web app from `dist/web/`.
4. Opens the user's default browser to `http://localhost:8000`.
