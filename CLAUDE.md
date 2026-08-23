# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal finance tracker (single-user) built with **Next.js 14 (Pages Router)** + TypeScript. Tracks French savings/investment accounts (PEA, Compte Courant, PEL, Livret A, Assurance-Vie, Intéressement), computes valuations and XIRR, and snapshots historical wealth. There is **no database** — all state is JSON files on disk.

## Commands

```bash
npm run dev          # concurrently runs `next dev` + CSS module type watcher
npm run build        # prebuild regenerates CSS types, then `next build`
npm run start        # production server (after build)
npm run lint         # next lint (eslint-config-next)
npm run css:types    # one-shot regen of *.module.css.d.ts typings
```

There is **no test runner configured** — do not assume `npm test` exists.

Docker: `docker-compose up -d` (standalone build; mounts external `DATA_PATH`/`LOGS_PATH` volumes).

## CSS Modules workflow (important, easy to break)

Styling uses CSS Modules with **`typed-css-modules` (tcm)** generating a `.module.css.d.ts` next to each `.module.css`. The dev script watches and regenerates these automatically; if you edit a `.module.css` outside `npm run dev`, run `npm run css:types` or TypeScript will error on stale/missing class names.

Conventions (see `.github/agents/css cleaner.agent.md`):
- Use **camelCase** selectors in `.module.css` files (`rootCard`, not `root-card`) so they map cleanly to the generated typings.
- Components should **import class names from the generated module typings**, not hardcode strings.
- Global colors are CSS custom properties in `src/styles/globals.css`; component-specific colors live in that component's module. Reuse the global variables rather than hardcoding hex values.

## Architecture

### Storage layer (`src/lib/`)
- `data.ts` — low-level `readJsonFile` / `writeJsonFile` / `ensureDirectoryExists`, plus file logging. All persistence routes through here.
- `savings.ts` — **the core domain module** (~900 lines). Owns the on-disk layout under `DATA_PATH`, all read/write helpers, valuation logic, XIRR, and historical snapshotting. Most business logic changes happen here.
- `finance.ts` — `PriceProvider` abstraction with a Yahoo Finance implementation (`yahoo-finance2`). `fetchCurrentPrices(tickers)` fetches in parallel and silently drops failures. `normalizeTicker` maps `EPA.XXX`/`EPA:XXX` → `XXX.PA` (Euronext Paris).

### On-disk data layout (relative to `DATA_PATH`, default `/app/data`)
```
accounts.json                       # all SavingsAccount records (one is isDefault)
transactions/<accountId>.json       # PEA buy/sell/dividend/fee transactions
balances/<accountId>.json           # balance snapshots (CompteCourant, PEL, LivretA, AssuranceVie)
deposits/<accountId>.json           # Intéressement deposits
annual-values/<accountId>.json      # year-end values (used for current-year XIRR)
historical/assets/<isin|ticker>.json
historical/accounts/<account-name>.json
historical/general/wealth.json      # net-worth time series
config/automated-tasks-history.json # last 100 cron executions
```

### Account-type polymorphism (the central design)
`AccountType` is a discriminated union. Each account carries an optional typed `config` (`PEAConfig`, `PELConfig`, etc.). Valuation is dispatched in `getAccountValuation()` (`savings.ts`) to a per-type `valuateXxx` function:
- **PEA** — live market prices × positions derived from transactions; real gain/loss.
- **CompteCourant** — latest balance snapshot, no gain.
- **PEL / LivretA** — compound the latest balance forward by a fractional-year rate (PEL applies a tax regime based on opening date/age; LivretA is tax-free). Marked `isEstimated`.
- **AssuranceVie** — latest balance + monthly contributions since; gain only realized at year-end.
- **Intéressement** — sum of per-deposit current values.

When adding an account type: extend the union + `ACCOUNT_TYPE_LABELS` + a `*Config` interface in `src/models/savings/index.ts`, add a `valuateXxx` and a `switch` case in `savings.ts`, and (if it uses balances) add it to `BALANCE_SUPPORTED_TYPES` in `src/pages/savings.tsx`.

Positions are recomputed from the transaction log each time (`calculateAccountPositions`) — there is no stored position state. Note the weighted-average cost basis and proportional sell logic are intentionally simplified (see comments in `calculateAccountPositions`).

### API layer (`src/pages/api/`)
Standard Next.js Pages API routes, thin wrappers over `lib/savings.ts`. REST-ish: `savings/accounts`, `savings/transactions/[accountId]`, `savings/balances/[accountId]`, `savings/deposits/[accountId]`, `savings/annual/[accountId]`, `savings/net-worth`, `savings/historical/...`.

- `net-worth` triggers live price fetching via `getNetWorthWithCurrentPrices()`, which **throws if any ticker price is missing** (fail-closed so totals are never silently wrong).
- `actions/perform-automated-tasks` is the **cron endpoint**: POST-only, gated by `Authorization: Bearer ${CRON_SECRET}`. Runs the three historical-snapshot tasks in parallel and appends an execution record (capped at 100). `actions/get-tasks-history` reads it back.

### MCP server (`mcp/`)
A **read-only** MCP server exposing the tracker to LLM clients. Tools are registered per domain under `mcp/tools/` and assembled by `mcp/create-server.ts`, which two transports share: stdio (`npm run mcp`, registered in `.mcp.json`) and Streamable HTTP (`POST /api/savings/mcp`, stateless, used by remote clients against the NAS). See `mcp/README.md` for the catalog.

Two constraints that are easy to break:
- `mcp/bootstrap.ts` **must stay the first import** in `mcp/server.ts`, and must never be imported from the HTTP route (Next loads env itself, and the console redirect would swallow app logs). It redirects `console.log` to stderr (`lib/data.ts` logs every file read, which would corrupt the stdio JSON-RPC stream) and loads `.env.local` before `lib/savings.ts` captures `DATA_PATH` into module-level consts.
- Keep it read-only. Writes are deliberately excluded — positions and cost basis are recomputed from the transaction ledger on every read, so a bad insert corrupts every downstream valuation.

### Frontend (`src/pages/`, `src/components/`, `src/hooks/`)
- Routing: `/` redirects to `/savings`; `/savings` (`savings.tsx`) is the dashboard with the net-worth banner + per-account cards; `/savings/default` resolves the default account and redirects to `/savings/[accountId]`; `/savings/[accountId]` is the detail view.
- `components/shared/` — generic UI (Button, Card, Modal, Tabs, sortable table), each re-exported via barrel `index.ts`.
- `components/savings/account-details/` — the detail view, with pure data helpers under `helpers/` (xirr, annualOverview, sorting, clipboard).
- `hooks/savings/` — data-fetching and form-editor hooks (`useSavingsAccountData`, `useAccountHistory`, `useAssetHistory`, editor hooks).
- Models are centralized in `src/models/` (`models/savings`, `models/shared`) and imported via the `@/` path alias. Always import types from there rather than redefining.

### Path aliases (`tsconfig.json`)
`@/*` → `src/*` (also `@/components/*`, `@/lib/*`). Use these, not deep relative paths.

## Environment variables
- `DATA_PATH` — JSON storage root (default `/app/data`).
- `LOGS_PATH` — app log dir (default `/app/logs`).
- `CRON_SECRET` — bearer token required by the automated-tasks endpoint.
- `MCP_SECRET` — optional; when set, `POST /api/savings/mcp` requires `Authorization: Bearer <secret>`.

The defaults are Docker container paths. For local dev these are overridden in `.env.local` to Windows dirs under `E:\Workspace\local\SavingsTracker\`. (`.env.local` also sets a `CONFIG_PATH`, but the code currently derives the config dir as `DATA_PATH/config` and does not read `CONFIG_PATH`.)
