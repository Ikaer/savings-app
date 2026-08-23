#!/usr/bin/env node
/**
 * Price-provider diagnostics for the savings tracker.
 *
 * Two modes, both read-only:
 *
 *   npx tsx scripts/check-prices.ts
 *       Live probe. Quotes a non-Euronext control ticker alongside the real ledger
 *       tickers so an upstream outage (everything fails, control included) is
 *       distinguishable from a ticker-format bug (only EPA:* fails). On 2026-08-23
 *       every ticker went missing at once because Yahoo's crumb handshake died behind
 *       the EU consent gate; without a control symbol that looked like a symbol bug.
 *
 *   npx tsx scripts/check-prices.ts --fail-closed
 *       Offline assertion of the error path. Stubs the provider so no price is
 *       available and checks that the valuation entry points raise instead of
 *       reporting a PEA as worth its cash balance alone. Makes no network calls.
 */
import '../mcp/bootstrap'; // loads .env.local and pushes app logging to stderr — must stay first

import { fetchCurrentPrices, priceProvider } from '../src/lib/finance';
import {
    fetchPricesOrThrow,
    getAccountSummary,
    getAccountValuation,
    getAllSavingsAccounts,
    getNetWorthWithCurrentPrices,
    getPricedTickers,
    MissingPricesError,
} from '../src/lib/savings';

/** Deliberately not Euronext: it bypasses `normalizeTicker`, so it isolates the fetch layer. */
const CONTROL_TICKER = 'AAPL';

const out = (line = '') => process.stdout.write(`${line}\n`);

function ledgerTickers(): string[] {
    return Array.from(new Set(getAllSavingsAccounts().flatMap(a => getPricedTickers(a.id)))).sort();
}

// ── Live probe ────────────────────────────────────────────────────────────────

async function liveProbe(): Promise<number> {
    const held = ledgerTickers();
    const all = [CONTROL_TICKER, ...held];

    out(`Probing ${all.length} ticker(s) — control "${CONTROL_TICKER}" + ${held.length} held\n`);
    const prices = await fetchCurrentPrices(all);

    for (const ticker of all) {
        const price = prices[ticker];
        const tag = ticker === CONTROL_TICKER ? ' (control)' : '';
        out(price === undefined ? `  MISSING  ${ticker}${tag}` : `  ok       ${ticker}${tag} = ${price}`);
    }

    const controlOk = prices[CONTROL_TICKER] !== undefined;
    const missingHeld = held.filter(t => prices[t] === undefined);
    out();

    if (controlOk && missingHeld.length === 0) {
        out('Healthy: every ticker resolved.');
        return 0;
    }
    if (!controlOk && missingHeld.length === held.length) {
        out('UPSTREAM OUTAGE: the control ticker failed too, so this is the price provider or its');
        out('auth handshake — not your ticker formats. Check src/lib/finance.ts and yahoo-finance2.');
        return 1;
    }
    if (controlOk && missingHeld.length > 0) {
        out(`SYMBOL PROBLEM: the provider is up (control resolved) but ${missingHeld.length} held ticker(s)`);
        out(`failed: ${missingHeld.join(', ')}. Check normalizeTicker and the ledger's ticker spelling.`);
        return 1;
    }
    out('Control ticker failed while held tickers resolved — likely the control symbol itself, not the app.');
    return 1;
}

// ── Fail-closed assertion ─────────────────────────────────────────────────────

let failures = 0;

function check(label: string, ok: boolean, detail = ''): void {
    out(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures += 1;
}

async function expectMissingPrices(label: string, run: () => Promise<unknown>): Promise<void> {
    try {
        const value = await run();
        check(label, false, `returned instead of throwing: ${JSON.stringify(value)?.slice(0, 120)}`);
    } catch (error) {
        check(label, error instanceof MissingPricesError, `threw ${(error as Error).name}`);
    }
}

async function failClosed(): Promise<number> {
    const pea = getAllSavingsAccounts().find(a => a.type === 'PEA');
    if (!pea) {
        out('No PEA account in DATA_PATH — nothing to assert.');
        return 1;
    }

    const tickers = getPricedTickers(pea.id);
    const original = priceProvider.getCurrentPrice.bind(priceProvider);
    const stub = (impl: (ticker: string) => Promise<number>) => {
        (priceProvider as { getCurrentPrice: (t: string) => Promise<number> }).getCurrentPrice = impl;
    };

    out(`Account under test: ${pea.name} [${pea.id}], ${tickers.length} priced ticker(s)\n`);

    try {
        out('Provider throwing on every ticker:');
        stub(async ticker => { throw new Error(`stubbed outage for ${ticker}`); });

        await expectMissingPrices('fetchPricesOrThrow refuses a partial price set', () =>
            fetchPricesOrThrow(tickers));
        await expectMissingPrices('getNetWorthWithCurrentPrices refuses a partial total', () =>
            getNetWorthWithCurrentPrices());

        out('\nProvider answering 0 (the shape that used to slip past the guard):');
        stub(async () => 0);
        const zeroed = await fetchCurrentPrices(tickers);
        check('a 0 price is treated as absent, not as a valid price',
            Object.keys(zeroed).length === 0,
            `${Object.keys(zeroed).length} of ${tickers.length} accepted`);
        await expectMissingPrices('fetchPricesOrThrow refuses a set of 0 prices', () =>
            fetchPricesOrThrow(tickers));

        out('\nWhat the unguarded path would have reported (why the guard is load-bearing):');
        const degraded = getAccountSummary(pea.id, {});
        const degradedValuation = await getAccountValuation(pea, {});
        out(`  positions priced: 0, summary.totalInvested: ${degraded?.totalInvested}`);
        out(`  valuation.currentValue: ${degradedValuation.currentValue}` +
            ` (isEstimated: ${degradedValuation.isEstimated}), cash: ${degraded?.cash?.balance}`);
        check('the degraded figures are indeed wrong, so the guard must stay',
            degraded?.totalInvested === 0 && degradedValuation.currentValue < 1000);
    } finally {
        stub(original);
    }

    out();
    out(failures === 0 ? 'All fail-closed assertions passed.' : `${failures} assertion(s) FAILED.`);
    return failures === 0 ? 0 : 1;
}

async function main(): Promise<void> {
    const mode = process.argv.includes('--fail-closed') ? failClosed : liveProbe;
    process.exitCode = await mode();
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
