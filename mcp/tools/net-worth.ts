import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNetWorthWithCurrentPrices } from '@/lib/savings';
import { ACCOUNT_TYPE_LABELS } from '@/models/savings';
import { jsonResult } from '../helpers';

export function registerNetWorthTool(server: McpServer): void {
    server.registerTool(
        'get_net_worth',
        {
            title: 'Get net worth',
            description:
                'Total net worth plus a per-account breakdown (current value, total contributed, ' +
                'gain/loss, gain %, last update). Fetches live market prices for PEA holdings and ' +
                'fails rather than returning a partial total if any price is unavailable. ' +
                'Accounts marked `isEstimated` are compounded forward from their last recorded balance.',
            inputSchema: {},
            annotations: { readOnlyHint: true },
        },
        async () => {
            const netWorth = await getNetWorthWithCurrentPrices();
            return jsonResult({
                total: netWorth.total,
                asOf: new Date().toISOString(),
                accounts: netWorth.accounts.map(valuation => ({
                    ...valuation,
                    accountTypeLabel: ACCOUNT_TYPE_LABELS[valuation.accountType],
                })),
            });
        }
    );
}
