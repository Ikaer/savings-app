import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getBalanceRecords, getDepositRecords, getTransactions } from '@/lib/savings';
import { AccountType, TransactionType } from '@/models/savings';
import { accountRef, jsonResult, requireAccountType, resolveAccount, takeMostRecent, withinRange } from '../helpers';

const BALANCE_TYPES: AccountType[] = ['CompteCourant', 'PEL', 'LivretA', 'AssuranceVie'];
const TRANSACTION_TYPES: [TransactionType, ...TransactionType[]] = [
    'Buy',
    'Sell',
    'Dividend',
    'Fee',
    'Deposit',
    'Withdrawal',
];

const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date, YYYY-MM-DD');

export function registerLedgerTools(server: McpServer): void {
    server.registerTool(
        'get_transactions',
        {
            title: 'Get transactions',
            description:
                'Raw transaction ledger of a PEA account (Buy, Sell, Dividend, Fee, Deposit, Withdrawal), ' +
                'oldest first. Positions and cost basis are recomputed from this ledger, so it is the ' +
                'source of truth for the account. Filter it — an unfiltered ledger can be long.',
            inputSchema: {
                account: z.string().describe('Account id, or its name'),
                from: isoDate.optional().describe('Only transactions on or after this date'),
                to: isoDate.optional().describe('Only transactions on or before this date'),
                type: z.enum(TRANSACTION_TYPES).optional().describe('Only this transaction type'),
                ticker: z.string().optional().describe('Only this ticker or ISIN'),
                limit: z
                    .number()
                    .int()
                    .positive()
                    .max(1000)
                    .default(200)
                    .describe('Keep at most this many of the most recent matches'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ account: reference, from, to, type, ticker, limit }) => {
            const account = resolveAccount(reference);
            requireAccountType(account, ['PEA'], 'Use get_balances or get_deposits instead.');

            const needle = ticker?.trim().toLowerCase();
            const matches = getTransactions(account.id)
                .filter(t => withinRange(t.date, from, to))
                .filter(t => !type || t.type === type)
                .filter(
                    t =>
                        !needle ||
                        t.ticker?.toLowerCase() === needle ||
                        t.isin?.toLowerCase() === needle
                )
                .sort((a, b) => a.date.localeCompare(b.date));

            const { records, truncated } = takeMostRecent(matches, limit);
            return jsonResult({
                account: accountRef(account),
                matched: matches.length,
                returned: records.length,
                truncated,
                transactions: records,
            });
        }
    );

    server.registerTool(
        'get_balances',
        {
            title: 'Get balance snapshots',
            description:
                'Recorded balance snapshots for a Compte Courant, PEL, Livret A or Assurance-Vie account, ' +
                'oldest first. These are the manually recorded figures - the only observed values for ' +
                'these accounts; the current value reported by get_net_worth is projected forward from ' +
                'the most recent one, so compare that date against today before trusting the projection.',
            inputSchema: {
                account: z.string().describe('Account id, or its name'),
                from: isoDate.optional().describe('Only snapshots on or after this date'),
                to: isoDate.optional().describe('Only snapshots on or before this date'),
                limit: z
                    .number()
                    .int()
                    .positive()
                    .max(1000)
                    .default(200)
                    .describe('Keep at most this many of the most recent snapshots'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ account: reference, from, to, limit }) => {
            const account = resolveAccount(reference);
            requireAccountType(account, BALANCE_TYPES, 'Use get_transactions or get_deposits instead.');

            const matches = getBalanceRecords(account.id)
                .filter(record => withinRange(record.date, from, to))
                .sort((a, b) => a.date.localeCompare(b.date));

            const { records, truncated } = takeMostRecent(matches, limit);
            return jsonResult({
                account: accountRef(account),
                matched: matches.length,
                returned: records.length,
                truncated,
                latest: matches[matches.length - 1] ?? null,
                balances: records,
            });
        }
    );

    server.registerTool(
        'get_deposits',
        {
            title: 'Get Intéressement deposits',
            description:
                'Deposits held in an Intéressement account: amount, investment strategy, lock-end date ' +
                'and last known value. The account value is the sum of the deposits\' current values. ' +
                'Those values are entered by hand, not priced live - `value_date` is when each was ' +
                'last updated, and nothing is projected forward from it.',
            inputSchema: {
                account: z.string().describe('Account id, or its name'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ account: reference }) => {
            const account = resolveAccount(reference);
            requireAccountType(account, ['Interessement'], 'Use get_transactions or get_balances instead.');

            const deposits = getDepositRecords(account.id).sort((a, b) =>
                a.deposit_date.localeCompare(b.deposit_date)
            );

            return jsonResult({
                account: accountRef(account),
                count: deposits.length,
                totalDeposited: deposits.reduce((sum, d) => sum + d.deposit_amount, 0),
                totalCurrentValue: deposits.reduce((sum, d) => sum + d.current_value, 0),
                deposits,
            });
        }
    );
}
