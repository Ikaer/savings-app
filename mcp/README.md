# Savings Tracker MCP server

Read-only MCP server over the tracker's data. It imports `src/lib/savings.ts`
directly, so **no Next.js server needs to be running** — it only needs
`DATA_PATH` pointing at the same JSON store (read from `.env.local` at startup).

```bash
npm run mcp
```

Registered for Claude Code via [`.mcp.json`](../.mcp.json) at the repo root.
For another client, use `npx tsx mcp/server.ts` with the repo as the working
directory (or set `SAVINGS_PROJECT_ROOT` to it).

## Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| `list_accounts` | — | Every account: id, name, type, currency, config |
| `get_account_summary` | `account`, `include?` | Valuation; for a PEA also positions, cash and dividends |
| `get_net_worth` | — | Live total + per-account breakdown |
| `get_transactions` | `account`, `from?`, `to?`, `type?`, `ticker?`, `limit?` | PEA transaction ledger |
| `get_balances` | `account`, `from?`, `to?`, `limit?` | Balance snapshots (Compte Courant, PEL, Livret A, Assurance-Vie) |
| `get_deposits` | `account` | Intéressement deposits |
| `get_wealth_history` | `from?`, `to?`, `granularity?`, `limit?` | Net-worth time series |
| `get_account_history` | `account`, `from?`, `to?`, `granularity?`, `limit?` | Per-account value/XIRR series (**PEA only**) |
| `get_asset_history` | `asset`, `from?`, `to?`, `granularity?`, `limit?` | Per-asset position/price series |
| `get_prices` | `tickers` | Current market prices via Yahoo Finance |

`account` accepts an id, a name, or a partial name. Snapshot series are
down-sampled monthly by default and capped at `limit` most-recent points, so a
multi-year history stays small; pass `granularity: "all"` for raw snapshots.

Also exposed as a resource: `savings://accounts`.

## Notes

- **Read-only by design.** Nothing here writes to disk or triggers the snapshot
  tasks. Writes were deliberately left out: positions and cost basis are
  recomputed from the transaction ledger on every read, so a bad insert would
  silently corrupt every downstream valuation.
- `get_net_worth` fails rather than returning a partial total when a market
  price is missing, matching the `/api/savings/net-worth` behaviour.
- `get_account_history` is restricted to PEA accounts on purpose.
  `storeHistoricalAccountsValues()` builds its records from the transaction
  ledger, so `historical/accounts/*.json` holds nothing but zeros for every
  other account type. Their real value history lives in `balances/`, reachable
  through `get_balances`. Lift the restriction if that task is ever fixed.
- `mcp/bootstrap.ts` must stay the first import in `server.ts`: it redirects
  `console.log` to stderr (`lib/data.ts` logs every file read, which would
  corrupt the stdio JSON-RPC stream) and loads `.env.local` before
  `lib/savings.ts` captures `DATA_PATH`.
