# PEA detail view — redesign proposal

Status: implemented
Scope: the PEA account detail view rendered by [`SavingsAccountDetails.tsx`](../src/components/savings/SavingsAccountDetails.tsx)

## Problem

The detail view currently renders **8 cards in one flat, uniform grid**
([`SavingsAccountDetails.tsx` lines 424–477](../src/components/savings/SavingsAccountDetails.tsx))
followed by a Positions/Transactions tab table.

The clutter is not caused by too much data — it's caused by **everything having the
same visual weight**. Eight equally-sized cards, same priority, in a uniform grid,
with no hierarchy telling the eye where to land. Four *different kinds* of information
are presented as if they were one kind:

| Kind | Current cards | Question it answers |
|------|--------------|---------------------|
| **Scalar KPIs** | Performance, Cash, Dividends (the big numbers) | "How am I doing right now?" |
| **Time series** | Portfolio Value, Gain/Loss %, Projected G/L | "How has it trended?" |
| **Composition** | Allocation by Group, Dividends-by-asset | "What's it made of?" |
| **Records** | Annual Overview, Positions, Transactions | "Show me the detail" |

Two concrete redundancies:
- `PortfolioValueCard`, `GainLossCard`, and `ProjectedGainLossCard` are the **same
  time-series rendered three ways** (value, gain/loss %, projection). They don't each
  deserve a card — they deserve one chart with a toggle.
- `PerformanceCard` / `CashCard` / `DividendsCard` are mostly **single numbers wearing
  full-card costumes**.

## Proposed structure — 4 tiers of decreasing priority

Reading order matches how the page is actually consumed:
headline numbers → trend → composition → records.

### Tier 1 — KPI strip (scalars, not cards)
Demote Performance, Cash, and Dividends headline numbers into a single compact stat
strip across the top: Current value · Total gain · XIRR · Cash · Dividends.
Five numbers you glance at, no chart chrome around each.

The detail that currently lives inside those cards moves down:
- per-asset dividend list → Tier 3 (Dividends by asset)
- cash-flow breakdown ("net transfers / dividends received / invested in stocks") →
  Tier 3 or a tooltip/expander on the Cash KPI

### Tier 2 — One chart panel (the biggest win)
Merge the three line-chart cards into **a single full-width panel** with:
- a **metric toggle**: Value / Gain-loss % / Projection
- a shared **period selector**: 1M / 3M / 6M / All

One large chart you actually read beats three cramped ones competing for the same
glance. This also **retires the "All Charts" button + `AllChartsModal`** once the inline
panel covers the same metrics (see "Decided: full chart merge" below).

### Tier 3 — Composition row (what it's made of)
Allocation pie (`GroupedAllocationCard`) + Dividends-by-asset breakdown sit together as
two equal-weight peers — they genuinely are peers ("what is this account made of").

### Tier 4 — Detail tables (records)
Fold `AnnualOverviewCard` into the **existing tab bar** alongside Positions and
Transactions. It's tabular, year-indexed history — it belongs with the other records,
not floating in the card grid.

Resulting tabs: **Positions · Transactions · Annual overview**

## Why this is more coherent than shrinking cards
- **Hierarchy matches how the page is read** — headline → trend → composition → records,
  instead of everything shouting at once.
- **Removes genuine duplication** rather than rearranging it — three chart cards + the
  All-Charts modal collapse into one component.
- **Smaller change than it looks** — components are already cleanly separated and
  prop-driven.

## Implementation notes
- Most of the work is **moving JSX** in
  [`SavingsAccountDetails.tsx` lines 424–477](../src/components/savings/SavingsAccountDetails.tsx)
  and changing `PerformanceCard` / `CashCard` / `DividendsCard` to render a **stat-strip
  variant** instead of a card shell.
- The **chart merge is the only real work**: a metric switcher wrapped around the shared
  `historyChartData` / `historyMetrics` already computed in the component (the projection
  view uses `historyMetrics`, same as `ProjectedGainLossCard` today).
- The annual-overview tab reuses `annualOverviewRows` + the existing
  `AnnualEditorModal` / `openAnnualEditor` wiring — only its placement changes.
- CSS Modules: a new stat-strip layout will need camelCase selectors and a
  `npm run css:types` regen (per CLAUDE.md).
- PEA-only cards (Cash, Dividends, Allocation) remain gated on `account.type === 'PEA'`
  exactly as today.

## Decided: full chart merge
The chart merge is the highest-leverage move. **Decision: do the full merge** — the
three chart cards (`PortfolioValueCard`, `GainLossCard`, `ProjectedGainLossCard`) collapse
into a single full-width panel with a metric toggle (Value / Gain-loss % / Projection) and
a shared period selector (1M / 3M / 6M / All). That's where most of the clutter lives, and
it reclaims the most space.

The "All Charts" action + `AllChartsModal` are retired once the inline panel covers the
same metrics.

(Rejected alternative — lighter "hero chart": keep the three chart cards but make Portfolio
Value full-width and shrink the other two. Less code, but reclaims less space and keeps the
duplication. Not chosen.)

## Components touched (reference)
- Restyle to stat-strip: `PerformanceCard`, `CashCard`, `DividendsCard`
- Merge into one panel: `PortfolioValueCard`, `GainLossCard`, `ProjectedGainLossCard`
  (+ likely retire `AllChartsModal` / the "All Charts" action)
- Move into tabs: `AnnualOverviewCard`
- Unchanged: `GroupedAllocationCard`, `PositionsTable`, `TransactionsTable`,
  `AccountHeaderActions`, `TransactionForm`
- Orchestration edits: [`SavingsAccountDetails.tsx`](../src/components/savings/SavingsAccountDetails.tsx)
