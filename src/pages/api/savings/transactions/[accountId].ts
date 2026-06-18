import { NextApiRequest, NextApiResponse } from 'next';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/savings';
import { Transaction, CASH_ONLY_TRANSACTION_TYPES } from '@/models/savings';

/** Cash-only transactions (Deposit/Withdrawal) move cash without an asset, so they carry no ticker. */
function isValidTransaction(transaction: Transaction): boolean {
    if (!transaction.id) {
        return false;
    }
    if (CASH_ONLY_TRANSACTION_TYPES.includes(transaction.type)) {
        return true;
    }
    return !!transaction.ticker;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    if (req.method === 'GET') {
        const transactions = getTransactions(accountId);
        return res.status(200).json(transactions);
    }

    if (req.method === 'POST') {
        const transaction: Transaction = req.body;
        if (!isValidTransaction(transaction)) {
            return res.status(400).json({ error: 'Missing transaction data' });
        }

        const success = addTransaction(accountId, transaction);
        if (!success) {
            return res.status(500).json({ error: 'Failed to add transaction' });
        }

        return res.status(201).json(transaction);
    }

    if (req.method === 'PUT') {
        const transaction: Transaction = req.body;
        if (!isValidTransaction(transaction)) {
            return res.status(400).json({ error: 'Missing transaction data' });
        }

        const success = updateTransaction(accountId, transaction);
        if (!success) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json(transaction);
    }

    if (req.method === 'DELETE') {
        const id = (req.query.id ?? req.body?.id) as string | undefined;
        if (!id) {
            return res.status(400).json({ error: 'Missing transaction id' });
        }

        const success = deleteTransaction(accountId, id);
        if (!success) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json({ id });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
