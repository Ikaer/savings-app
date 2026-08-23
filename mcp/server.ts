#!/usr/bin/env node
/**
 * Read-only MCP server over the savings tracker's data, on stdio.
 *
 * It talks to `src/lib/savings.ts` directly rather than to the Next.js API
 * routes, so it needs no running server - only DATA_PATH pointing at the same
 * JSON store. Every tool is read-only: nothing here writes to disk.
 *
 * Run with: npm run mcp
 *
 * The same tools are served over HTTP by src/pages/api/savings/mcp.ts, which is
 * what a remote client (Claude Desktop against the NAS) should use instead.
 */
import './bootstrap'; // must stay first - see the file for why

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSavingsMcpServer } from './create-server';

async function main(): Promise<void> {
    const server = createSavingsMcpServer();
    await server.connect(new StdioServerTransport());
    process.stderr.write(`savings-tracker MCP server ready (DATA_PATH=${process.env.DATA_PATH})
`);
}

main().catch(error => {
    process.stderr.write(`Fatal error starting savings-tracker MCP server: ${error}
`);
    process.exit(1);
});
