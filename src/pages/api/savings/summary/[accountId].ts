import { NextApiRequest, NextApiResponse } from 'next';
import {
    getAccountSummary,
    calculateAccountPositions,
    getSavingsAccount,
    getAccountValuation,
    fetchPricesOrThrow,
    getPricedTickers,
    MissingPricesError
} from '@/lib/savings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
        const account = getSavingsAccount(accountId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // For PEA accounts, return the full positions-based summary.
        // Fails closed on a partial price fetch: every figure below is derived from the price map,
        // and unpriced holdings are dropped, so a degraded response reports the account as worth
        // its cash balance alone rather than admitting it could not be valued.
        if (account.type === 'PEA') {
            const currentPrices = await fetchPricesOrThrow(getPricedTickers(accountId));
            const summary = getAccountSummary(accountId, currentPrices);
            const positions = calculateAccountPositions(accountId, currentPrices);

            if (!summary) {
                return res.status(404).json({ error: 'Account not found' });
            }

            return res.status(200).json({ summary, positions });
        }

        // For all other account types, return the unified valuation
        const valuation = await getAccountValuation(account);
        return res.status(200).json({
            summary: {
                accountId: valuation.accountId,
                totalInvested: valuation.totalContributed,
                currentValue: valuation.currentValue,
                totalGainLoss: valuation.totalGainLoss,
                xirr: 0,
            },
            positions: [],
            valuation,
        });
    } catch (error) {
        if (error instanceof MissingPricesError) {
            console.error('Error fetching account summary:', error.message);
            return res.status(503).json({ error: error.message, missingTickers: error.missing });
        }
        console.error('Error fetching account summary:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
