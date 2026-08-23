import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchCurrentPrices } from '@/lib/finance';
import { jsonResult } from '../helpers';

export function registerPriceTools(server: McpServer): void {
    server.registerTool(
        'get_prices',
        {
            title: 'Get current market prices',
            description:
                'Current market price for one or more tickers, via Yahoo Finance. Euronext Paris ' +
                'tickers may be given as "EPA.XXX", "EPA:XXX" or "XXX.PA". Tickers whose price could ' +
                'not be fetched are listed under `missing` rather than failing the call.',
            inputSchema: {
                tickers: z.array(z.string()).min(1).describe('Tickers to quote'),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async ({ tickers }) => {
            const prices = await fetchCurrentPrices(tickers);
            const missing = tickers.filter(ticker => prices[ticker] === undefined);

            return jsonResult({
                prices,
                missing,
                asOf: new Date().toISOString(),
            });
        }
    );
}
