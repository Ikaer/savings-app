#!/usr/bin/env node
/**
 * Read-only MCP server over the savings tracker's data.
 *
 * It talks to `src/lib/savings.ts` directly rather than to the Next.js API
 * routes, so it needs no running server — only DATA_PATH pointing at the same
 * JSON store. Every tool is read-only: nothing here writes to disk.
 *
 * Run with: npm run mcp
 */
import './bootstrap'; // must stay first — see the file for why

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getAllSavingsAccounts } from '@/lib/savings';
import { ACCOUNT_TYPE_LABELS } from '@/models/savings';
import { registerAccountTools } from './tools/accounts';
import { registerHistoryTools } from './tools/history';
import { registerLedgerTools } from './tools/ledger';
import { registerNetWorthTool } from './tools/net-worth';
import { registerPriceTools } from './tools/prices';

const server = new McpServer(
    { name: 'savings-tracker', version: '1.0.0' },
    {
        instructions:
            'Read-only access to a personal French savings and investment tracker (PEA, Compte Courant, ' +
            'PEL, Livret A, Assurance-Vie, Intéressement). Resolve an account with list_accounts before ' +
            'calling account-scoped tools; they accept an id or a name. Amounts are in each account\'s ' +
            'own currency (EUR throughout). Values flagged `isEstimated` are projections compounded ' +
            'forward from the last recorded balance, not observed figures. This server never writes: ' +
            'it cannot add transactions, record balances or trigger snapshots.',
    }
);

// The account list is small, stable and needed for nearly every call, so it is
// also exposed as a resource clients can pull in without spending a tool call.
server.registerResource(
    'accounts',
    'savings://accounts',
    {
        title: 'Savings accounts',
        description: 'All tracked accounts with their ids, types and configuration',
        mimeType: 'application/json',
    },
    async uri => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(
                    getAllSavingsAccounts().map(account => ({
                        ...account,
                        typeLabel: ACCOUNT_TYPE_LABELS[account.type],
                    })),
                    null,
                    2
                ),
            },
        ],
    })
);

registerAccountTools(server);
registerNetWorthTool(server);
registerLedgerTools(server);
registerHistoryTools(server);
registerPriceTools(server);

async function main(): Promise<void> {
    await server.connect(new StdioServerTransport());
    process.stderr.write(`savings-tracker MCP server ready (DATA_PATH=${process.env.DATA_PATH})\n`);
}

main().catch(error => {
    process.stderr.write(`Fatal error starting savings-tracker MCP server: ${error}\n`);
    process.exit(1);
});
