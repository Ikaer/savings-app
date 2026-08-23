import { NextApiRequest, NextApiResponse } from 'next';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createSavingsMcpServer } from '../../../../mcp/create-server';

/**
 * MCP endpoint (Streamable HTTP), so a remote client can reach the tracker
 * without a local checkout. Same read-only tools as the stdio entry point.
 *
 * Stateless: a fresh server and transport per request, so nothing is kept
 * between calls and several clients can talk to it at once.
 *
 * Set MCP_SECRET to require `Authorization: Bearer <secret>`. Left unset the
 * endpoint is open, which is only reasonable on a trusted LAN.
 */
export const config = {
    api: {
        bodyParser: { sizeLimit: '1mb' },
        externalResolver: true,
    },
};

function unauthorized(res: NextApiResponse) {
    return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        // No SSE stream and no session state to tear down, so GET/DELETE have nothing to do.
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed. This endpoint speaks JSON-RPC over POST.' },
            id: null,
        });
    }

    const secret = process.env.MCP_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
        return unauthorized(res);
    }

    const server = createSavingsMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
        void transport.close();
        void server.close();
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('MCP request failed:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            });
        }
    }
}
