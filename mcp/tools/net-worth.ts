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
                'Accounts marked `isEstimated` are projected forward from their last recorded balance ' +
                'at the configured rate. Gain is measured only for the PEA and Intéressement: a Compte ' +
                'Courant reports 0 by construction (its balance counts as its own contribution), and ' +
                "the Assurance-Vie split is reconstructed from the account's opening date and monthly " +
                'premium rather than from a ledger, so treat its gain as an estimate too.',
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
