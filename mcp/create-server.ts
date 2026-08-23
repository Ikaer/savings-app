/**
 * Builds the MCP server and registers every tool. Shared by both transports:
 * the stdio entry point (`mcp/server.ts`) and the HTTP endpoint served by the
 * Next app (`src/pages/api/savings/mcp.ts`).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllSavingsAccounts } from '@/lib/savings';
import { ACCOUNT_TYPE_LABELS } from '@/models/savings';
import { registerAccountTools } from './tools/accounts';
import { registerHistoryTools } from './tools/history';
import { registerLedgerTools } from './tools/ledger';
import { registerNetWorthTool } from './tools/net-worth';
import { registerPriceTools } from './tools/prices';

export const SERVER_INFO = { name: 'savings-tracker', version: '1.0.0' };

export const SERVER_INSTRUCTIONS =
    'Read-only access to a personal French savings and investment tracker (PEA, Compte Courant, ' +
    'PEL, Livret A, Assurance-Vie, Intéressement). Resolve an account with list_accounts before ' +
    "calling account-scoped tools; they accept an id or a name. Amounts are in each account's " +
    'own currency (EUR throughout). Values flagged `isEstimated` are projections compounded ' +
    'forward from the last recorded balance, not observed figures. This server never writes: ' +
    'it cannot add transactions, record balances or trigger snapshots.';

export function createSavingsMcpServer(): McpServer {
    const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });

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

    return server;
}
