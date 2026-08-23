import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    calculateAccountPositions,
    calculateCurrentYearXIRR,
    fetchPricesOrThrow,
    getAccountSummary,
    getAccountValuation,
    getAllSavingsAccounts,
    getAnnualAccountValues,
    getPricedTickers,
    MissingPricesError,
} from '@/lib/savings';
import { ACCOUNT_TYPE_LABELS } from '@/models/savings';
import { accountRef, jsonResult, resolveAccount } from '../helpers';

const INCLUDABLE = ['positions', 'cash', 'dividends', 'annualValues'] as const;

export function registerAccountTools(server: McpServer): void {
    server.registerTool(
        'list_accounts',
        {
            title: 'List savings accounts',
            description:
                'List every tracked account with its id, name, type, currency and type-specific config ' +
                '(PEL rate, Livret A rate, Assurance-Vie contribution, ...). Start here: every other ' +
                'account-scoped tool is keyed by the id returned by this one. Does not fetch market prices.',
            inputSchema: {},
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async () => {
            const accounts = getAllSavingsAccounts();
            return jsonResult({
                count: accounts.length,
                accounts: accounts.map(account => ({
                    ...account,
                    typeLabel: ACCOUNT_TYPE_LABELS[account.type],
                })),
            });
        }
    );

    server.registerTool(
        'get_account_summary',
        {
            title: 'Get account summary',
            description:
                'Valuation of a single account: invested amount, current value, gain/loss and XIRR. ' +
                'For a PEA it also returns live-priced positions, the uninvested cash breakdown and the ' +
                'dividend summary. Other account types return the unified valuation only, flagged ' +
                '`isEstimated` when the value is compounded forward from the last recorded balance.',
            inputSchema: {
                account: z.string().describe('Account id, or its name (e.g. "PEA" or "Livret A")'),
                include: z
                    .array(z.enum(INCLUDABLE))
                    .optional()
                    .describe(
                        'Optional sections. Defaults to positions, cash and dividends. ' +
                        '"annualValues" adds the recorded year-end values.'
                    ),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ account: reference, include }) => {
            const account = resolveAccount(reference);
            const sections = new Set<string>(include ?? ['positions', 'cash', 'dividends']);

            // Only a PEA is priced from the market; every other type values itself
            // from its own balance/deposit records. Fails closed, like get_net_worth.
            let currentPrices: Record<string, number> = {};
            if (account.type === 'PEA') {
                try {
                    currentPrices = await fetchPricesOrThrow(getPricedTickers(account.id));
                } catch (error) {
                    if (!(error instanceof MissingPricesError)) throw error;
                    throw new Error(
                        `${error.message} The stored data is unaffected — get_transactions still returns ` +
                        'the full ledger, and get_prices will show which tickers the price provider is rejecting.'
                    );
                }
            }

            const valuation = await getAccountValuation(account, currentPrices);
            const payload: Record<string, unknown> = { account: accountRef(account), valuation };

            if (account.type === 'PEA') {
                const summary = getAccountSummary(account.id, currentPrices);
                if (summary) {
                    payload.summary = {
                        totalInvested: summary.totalInvested,
                        currentValue: summary.currentValue,
                        totalGainLoss: summary.totalGainLoss,
                        xirr: summary.xirr,
                        currentYearXirr: calculateCurrentYearXIRR(account.id, summary.currentValue),
                    };
                    if (sections.has('cash')) payload.cash = summary.cash;
                    if (sections.has('dividends')) payload.dividends = summary.dividends;
                }
                if (sections.has('positions')) {
                    payload.positions = calculateAccountPositions(account.id, currentPrices);
                }
            }

            if (sections.has('annualValues')) {
                payload.annualValues = getAnnualAccountValues(account.id);
            }

            return jsonResult(payload);
        }
    );
}
