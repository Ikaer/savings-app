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

/**
 * Loaded once per session, so this is the right place for the caveats that apply across tools —
 * stating them here keeps them out of every individual tool description.
 *
 * These own deliberate simplifications in the tracker rather than describing bugs: the projections
 * really are linear, and zero really is overloaded. A consumer that does not know both will report
 * a confidently wrong figure.
 */
export const SERVER_INSTRUCTIONS =
    'Read-only access to a personal French savings and investment tracker (PEA, Compte Courant, ' +
    'PEL, Livret A, Assurance-Vie, Intéressement). Resolve an account with list_accounts before ' +
    "calling account-scoped tools; they accept an id or a name. Amounts are in each account's " +
    'own currency (EUR throughout). ' +
    'Values flagged `isEstimated` are projected forward from the last recorded balance by simple ' +
    'linear interpolation of the configured annual rate — not compounded, and not observed. ' +
    '`lastUpdated` is the date of that anchoring balance, so its age is how stale the estimate is; ' +
    'quote that age whenever the estimate carries the answer. ' +
    'Read zeros defensively: this tracker has no distinct representation for "unknown", so a 0 ' +
    'gain, a 0 cost basis or a 0 XIRR can mean the quantity was not computable rather than ' +
    'genuinely zero. Prefer saying a figure is unavailable over reporting a confident 0. ' +
    'This server never writes: it cannot add transactions, record balances or trigger snapshots.';

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
