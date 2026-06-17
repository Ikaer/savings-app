import React, { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { AssetPosition, Transaction, TransactionType } from '@/models/savings';

interface TransactionFormProps {
    open?: boolean;
    mode?: 'add' | 'edit';
    initialTransaction?: Transaction | null;
    positions?: AssetPosition[];
    onSave: (transaction: Transaction) => void;
    onClose: () => void;
}

// Buy/Sell drive positions (quantity × price). Dividend/Fee attach to an asset but carry a flat
// cash amount. Deposit/Withdrawal are pure cash movements with no asset.
const TRADE_TYPES: TransactionType[] = ['Buy', 'Sell'];
const AMOUNT_TYPES: TransactionType[] = ['Dividend', 'Fee', 'Deposit', 'Withdrawal'];
const CASH_ONLY_TYPES: TransactionType[] = ['Deposit', 'Withdrawal'];

const EMPTY_FORM = {
    date: new Date().toISOString().split('T')[0],
    type: 'Buy' as TransactionType,
    assetName: '',
    isin: '',
    ticker: '',
    quantity: '',
    unitPrice: '',
    fees: '0',
    ttf: '0',
    amount: ''
};

export default function TransactionForm({
    open = true,
    mode = 'add',
    initialTransaction,
    positions = [],
    onSave,
    onClose
}: TransactionFormProps) {
    const [selectedPositionIsin, setSelectedPositionIsin] = useState('');
    const [formData, setFormData] = useState({ ...EMPTY_FORM });

    const handlePrefill = () => {
        const position = positions.find(p => p.isin === selectedPositionIsin);
        if (!position) return;
        setFormData(prev => ({
            ...prev,
            assetName: position.name,
            ticker: position.ticker,
            isin: position.isin
        }));
    };

    useEffect(() => {
        if (!initialTransaction) {
            setFormData({ ...EMPTY_FORM });
            return;
        }

        setFormData({
            date: initialTransaction.date,
            type: initialTransaction.type,
            assetName: initialTransaction.assetName,
            isin: initialTransaction.isin,
            ticker: initialTransaction.ticker,
            quantity: initialTransaction.quantity.toString(),
            unitPrice: initialTransaction.unitPrice.toString(),
            fees: initialTransaction.fees.toString(),
            ttf: initialTransaction.ttf.toString(),
            amount: initialTransaction.totalAmount.toString()
        });
    }, [initialTransaction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isTrade = TRADE_TYPES.includes(formData.type);
    const isAmount = AMOUNT_TYPES.includes(formData.type);
    const isCashOnly = CASH_ONLY_TYPES.includes(formData.type);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const quantity = parseFloat(formData.quantity || '0');
        const unitPrice = parseFloat(formData.unitPrice || '0');
        const fees = parseFloat(formData.fees || '0');
        const ttf = parseFloat(formData.ttf || '0');
        const amount = parseFloat(formData.amount || '0');

        // Buy/Sell derive their total from quantity × price (± costs); everything else is a flat amount.
        let totalAmount = amount;
        if (formData.type === 'Buy') {
            totalAmount = (quantity * unitPrice) + fees + ttf;
        } else if (formData.type === 'Sell') {
            totalAmount = (quantity * unitPrice) - fees;
        }

        const transaction: Transaction = {
            id: initialTransaction?.id ?? Math.random().toString(36).substr(2, 9),
            date: formData.date,
            type: formData.type,
            assetName: formData.assetName,
            isin: isCashOnly ? '' : formData.isin,
            ticker: isCashOnly ? '' : formData.ticker,
            quantity: isTrade ? quantity : 0,
            unitPrice: isTrade ? unitPrice : 0,
            fees: isTrade ? fees : 0,
            ttf: isTrade ? ttf : 0,
            totalAmount
        };

        onSave(transaction);
    };

    return (
        <Modal
            open={open}
            title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
            onClose={onClose}
            size="lg"
        >
            <form onSubmit={handleSubmit}>
                {positions.length > 0 && mode === 'add' && !isCashOnly && (
                    <div className={sharedStyles.prefillRow}>
                        <select
                            className={sharedStyles.select}
                            value={selectedPositionIsin}
                            onChange={e => setSelectedPositionIsin(e.target.value)}
                        >
                            <option value="">Prefill from existing position...</option>
                            {positions.map(pos => (
                                <option key={pos.isin} value={pos.isin}>
                                    {pos.name} ({pos.ticker})
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="secondary"
                            onClick={handlePrefill}
                            disabled={!selectedPositionIsin}
                        >
                            Prefill
                        </Button>
                    </div>
                )}
                <div className={sharedStyles.formGrid}>
                    <div className={sharedStyles.formGroup}>
                        <label className={sharedStyles.label}>Date</label>
                        <input
                            type="date"
                            name="date"
                            className={sharedStyles.input}
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={sharedStyles.formGroup}>
                        <label className={sharedStyles.label}>Type</label>
                        <select
                            name="type"
                            className={sharedStyles.select}
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="Buy">Buy</option>
                            <option value="Sell">Sell</option>
                            <option value="Dividend">Dividend</option>
                            <option value="Fee">Fee</option>
                            <option value="Deposit">Deposit (cash in)</option>
                            <option value="Withdrawal">Withdrawal (cash out)</option>
                        </select>
                    </div>

                    <div className={sharedStyles.formGroupFull}>
                        <label className={sharedStyles.label}>{isCashOnly ? 'Label (optional)' : 'Asset Name'}</label>
                        <input
                            type="text"
                            name="assetName"
                            className={sharedStyles.input}
                            placeholder={isCashOnly ? 'e.g. Monthly transfer' : 'e.g. iShares MSCI World Swap PEA'}
                            value={formData.assetName}
                            onChange={handleChange}
                            required={!isCashOnly}
                        />
                    </div>

                    {!isCashOnly && (
                        <>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Ticker</label>
                                <input
                                    type="text"
                                    name="ticker"
                                    className={sharedStyles.input}
                                    placeholder="e.g. WPEA.PA"
                                    value={formData.ticker}
                                    onChange={handleChange}
                                    required={isTrade || formData.type === 'Dividend'}
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>ISIN</label>
                                <input
                                    type="text"
                                    name="isin"
                                    className={sharedStyles.input}
                                    placeholder="e.g. IE0002XZSHO1"
                                    value={formData.isin}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    {isTrade && (
                        <>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Quantity</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="quantity"
                                    className={sharedStyles.input}
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Unit Price (EUR)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="unitPrice"
                                    className={sharedStyles.input}
                                    value={formData.unitPrice}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Fees (EUR)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="fees"
                                    className={sharedStyles.input}
                                    value={formData.fees}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>TTF (EUR)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="ttf"
                                    className={sharedStyles.input}
                                    value={formData.ttf}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    {isAmount && (
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Amount (EUR)</label>
                            <input
                                type="number"
                                step="any"
                                name="amount"
                                className={sharedStyles.input}
                                placeholder="e.g. 4.32"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}
                </div>

                <div className={sharedStyles.formActions}>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        {mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
