import React, { useState } from 'react';
import { Button, Modal } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import styles from './OpeningBalanceModal.module.css';
import { CashSummary } from '@/models/savings';

interface OpeningBalanceModalProps {
  open: boolean;
  /** Derived cash breakdown for the account (may be negative when under-funded). */
  cash?: CashSummary;
  /** Date the inserted opening deposit will carry (earliest transaction, or today). */
  openingDate: string;
  formatCurrency: (val: number) => string;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void> | void;
}

export default function OpeningBalanceModal({
  open,
  cash,
  openingDate,
  formatCurrency,
  onClose,
  onConfirm
}: OpeningBalanceModalProps) {
  const [bankCashInput, setBankCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const derived = cash?.balance ?? 0;
  const investedNet = cash ? -cash.fromTrades : 0; // fromTrades is negative for net buys
  const dividends = cash?.fromDividends ?? 0;
  const existingDeposits = cash?.fromDeposits ?? 0;

  const bankCash = parseFloat(bankCashInput);
  const hasInput = bankCashInput.trim() !== '' && !Number.isNaN(bankCash);
  // The single deposit that makes the app's derived cash equal the real bank balance.
  // This subtraction self-corrects for dividends/fees/sells already in the ledger — no double count.
  const opening = hasInput ? bankCash - derived : 0;

  const handleConfirm = async () => {
    if (!hasInput) return;
    setSubmitting(true);
    try {
      await onConfirm(opening);
      setBankCashInput('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Set opening cash balance" onClose={onClose} size="md">
      <p className={styles.intro}>
        The app derives cash from the full ledger. If historical deposits were never recorded, the
        balance goes negative and shows 0. Enter the cash your bank shows for this account today and a
        single dated <strong>Opening balance</strong> deposit will be inserted so the figures match.
      </p>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span>Invested in stocks (net)</span>
          <span>{formatCurrency(investedNet)}</span>
        </div>
        <div className={styles.row}>
          <span>Dividends received</span>
          <span>{formatCurrency(dividends)}</span>
        </div>
        <div className={styles.row}>
          <span>Deposits already recorded</span>
          <span>{formatCurrency(existingDeposits)}</span>
        </div>
        <div className={`${styles.row} ${styles.rowMuted}`}>
          <span>App&apos;s current derived cash</span>
          <span className={derived < 0 ? styles.negative : undefined}>{formatCurrency(derived)}</span>
        </div>
      </div>

      <div className={sharedStyles.formGroup}>
        <label className={sharedStyles.label}>Current cash balance shown by your bank</label>
        <input
          type="number"
          step="0.01"
          className={sharedStyles.input}
          placeholder="e.g. 90.00"
          value={bankCashInput}
          onChange={e => setBankCashInput(e.target.value)}
          autoFocus
        />
      </div>

      {hasInput && (
        <div className={styles.result}>
          <span>Opening deposit to insert ({openingDate})</span>
          <span className={styles.resultValue}>{formatCurrency(opening)}</span>
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!hasInput || submitting}>
          {submitting ? 'Inserting...' : 'Insert opening deposit'}
        </Button>
      </div>
    </Modal>
  );
}
