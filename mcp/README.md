# Savings Tracker MCP server

Read-only MCP server over the tracker's data. It imports `src/lib/savings.ts`
directly, so **no Next.js server needs to be running** — it only needs
`DATA_PATH` pointing at the same JSON store (read from `.env.local` at startup).

Two transports share the same tools, both built by
[`create-server.ts`](create-server.ts):

- **stdio** — `npm run mcp` ([`server.ts`](server.ts)). Registered for Claude
  Code via [`.mcp.json`](../.mcp.json) at the repo root. Needs a local checkout.
- **HTTP** — `POST /api/savings/mcp`, served by the Next app
  ([`src/pages/api/savings/mcp.ts`](../src/pages/api/savings/mcp.ts)). Stateless
  Streamable HTTP: a fresh server per request, no session state. This is what a
  remote client uses, e.g. `http://syno:12351/api/savings/mcp` on the NAS.

Set `MCP_SECRET` to require `Authorization: Bearer <secret>` on the HTTP
endpoint. Left unset it is open, which is only reasonable on a trusted LAN.

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
- `get_net_worth` and `get_account_summary` both fail rather than returning a
  valuation when any market price is missing. A partial price fetch does not
  degrade gracefully: positions, invested amount and XIRR are all derived from
  prices, so the account would be reported as worth its cash balance alone.
  `get_prices` is the exception — it reports unresolved tickers under `missing`
  so the price provider itself can be diagnosed.
- **Owned simplifications.** Several figures are approximations the app has always
  made; they are stated in `SERVER_INSTRUCTIONS` and in the relevant tool
  descriptions so an LLM consumer does not report them as exact. Keep the two in
  sync when the maths changes:
  - `isEstimated` projections are **linear**, not compounded:
    `balance * (1 + rate * fractionOfYear)`. `lastUpdated` is the anchoring
    snapshot's date, so its age is the estimate's staleness.
  - **Zero doubles as "unknown".** `calculateXIRR` returns `0` when the solver
    fails, `calculateCurrentYearXIRR` returns `0` with no prior-year anchor, and
    `costBasis` is `0` for an asset with no live position. None are distinguishable
    from a genuine zero — fixing that properly means a nullable valuation layer.
  - PEA `totalContributed` is cost basis **plus uninvested cash**, dividends
    included and floored at zero, so it exceeds net deposits.
  - Cost basis is a weighted average reduced proportionally on sale, not per-lot.
  - XIRR is Buy/Sell only — dividends, fees and deposits never enter the rate.
  - Assurance-Vie contributions are reconstructed from `opening_date` and
    `monthly_contribution`; there is no ledger for that type.
- `get_account_history` is restricted to PEA accounts on purpose.
  `storeHistoricalAccountsValues()` builds its records from the transaction
  ledger, so `historical/accounts/*.json` holds nothing but zeros for every
  other account type. Their real value history lives in `balances/`, reachable
  through `get_balances`. Lift the restriction if that task is ever fixed.
- `mcp/bootstrap.ts` must stay the first import in `server.ts`: it redirects
  `console.log` to stderr (`lib/data.ts` logs every file read, which would
  corrupt the stdio JSON-RPC stream) and loads `.env.local` before
  `lib/savings.ts` captures `DATA_PATH`.
