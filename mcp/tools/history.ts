import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    getHistoricalAccountRecords,
    getHistoricalAssetRecords,
    getHistoricalWealthRecords,
} from '@/lib/savings';
import {
    accountRef,
    downsample,
    jsonResult,
    requireAccountType,
    resolveAccount,
    takeMostRecent,
    withinRange,
    Granularity,
} from '../helpers';

const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date, YYYY-MM-DD');

const granularity = z
    .enum(['all', 'daily', 'weekly', 'monthly'])
    .default('monthly')
    .describe(
        'Down-sampling: keep the last snapshot of each day/week/month. Use "all" only for short ranges.'
    );

const limit = z
    .number()
    .int()
    .positive()
    .max(1000)
    .default(120)
    .describe('Keep at most this many of the most recent points');

/** Snapshots are taken by the automated task, so a series can hold many points per day. */
function shape<T extends { timestamp: string }>(
    all: T[],
    from: string | undefined,
    to: string | undefined,
    grain: Granularity,
    max: number
) {
    const matches = all.filter(record => withinRange(record.timestamp, from, to));
    const sampled = downsample(matches, record => record.timestamp, grain);
    const { records, truncated } = takeMostRecent(sampled, max);

    return {
        matched: matches.length,
        returned: records.length,
        granularity: grain,
        truncated,
        first: records[0] ?? null,
        last: records[records.length - 1] ?? null,
        records,
    };
}

export function registerHistoryTools(server: McpServer): void {
    server.registerTool(
        'get_wealth_history',
        {
            title: 'Get net-worth history',
            description:
                'Historical net-worth time series (total and number of accounts per snapshot), oldest ' +
                'first. Built from the periodic snapshot task, so it only covers dates where a snapshot ' +
                'ran. Use this for growth over time; use get_net_worth for the value right now.',
            inputSchema: {
                from: isoDate.optional().describe('Only snapshots on or after this date'),
                to: isoDate.optional().describe('Only snapshots on or before this date'),
                granularity,
                limit,
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ from, to, granularity: grain, limit: max }) =>
            jsonResult(shape(getHistoricalWealthRecords(), from, to, grain, max))
    );

    server.registerTool(
        'get_account_history',
        {
            title: 'Get account history',
            description:
                'Historical time series for one account: invested amount, current value, gain/loss, ' +
                'lifetime XIRR and current-year XIRR at each snapshot, oldest first. PEA only — the ' +
                'snapshot task derives these from the transaction ledger, which no other account type has. ' +
                'For the value history of any other account type, use get_balances.',
            inputSchema: {
                account: z.string().describe('Account id, or its name'),
                from: isoDate.optional().describe('Only snapshots on or after this date'),
                to: isoDate.optional().describe('Only snapshots on or before this date'),
                granularity,
                limit,
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ account: reference, from, to, granularity: grain, limit: max }) => {
            const account = resolveAccount(reference);
            // The snapshot task records zeros for every non-PEA account, so this
            // series is meaningless for them — send callers to the real data.
            requireAccountType(
                account,
                ['PEA'],
                'Use get_balances for its recorded value history, or get_deposits for an Intéressement account.'
            );

            const all = getHistoricalAccountRecords(account.name, account.id);
            return jsonResult({ account: accountRef(account), ...shape(all, from, to, grain, max) });
        }
    );

    server.registerTool(
        'get_asset_history',
        {
            title: 'Get asset history',
            description:
                'Historical time series for a single held asset: quantity, average purchase price, ' +
                'invested amount, market price, value and unrealized gain/loss at each snapshot. ' +
                'Only covers assets held in a PEA — the ISIN or ticker comes from get_account_summary positions.',
            inputSchema: {
                asset: z.string().describe('ISIN (preferred) or ticker of the asset'),
                from: isoDate.optional().describe('Only snapshots on or after this date'),
                to: isoDate.optional().describe('Only snapshots on or before this date'),
                granularity,
                limit,
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ asset, from, to, granularity: grain, limit: max }) => {
            const all = getHistoricalAssetRecords(asset);
            if (all.length === 0) {
                throw new Error(
                    `No historical records for asset "${asset}". Snapshots are keyed by ISIN (falling back ` +
                    'to ticker); check the positions returned by get_account_summary for the exact value.'
                );
            }
            return jsonResult({ asset, ...shape(all, from, to, grain, max) });
        }
    );
}
