import React from 'react';
import { Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { CashSummary } from '@/models/savings';

interface CashCardProps {
  cash: CashSummary;
  /** Stock-only current value, used to express cash as a share of the whole account. */
  investedValue: number;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function CashCard({ cash, investedValue, formatCurrency, formatPercent }: CashCardProps) {
  // A negative derived balance is impossible in reality — it only means deposits weren't fully
  // recorded. Floor the headline figures at 0 (the honest component breakdown is shown below).
  const balance = Math.max(0, cash.balance);
  const accountTotal = investedValue + balance;
  const dragPct = accountTotal > 0 ? (balance / accountTotal) * 100 : 0;

  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Cash</h2>
      <div className={sharedStyles.statsGrid} style={{ marginTop: '1rem' }}>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>Cash Balance</span>
          <span className={sharedStyles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(balance)}</span>
        </div>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>Cash Drag (% of account)</span>
          <span className={sharedStyles.statValue}>{formatPercent(dragPct)}</span>
        </div>
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Net transfers in</span><span>{formatCurrency(cash.fromDeposits)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Dividends received</span><span>{formatCurrency(cash.fromDividends)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Invested in stocks (net)</span><span>{formatCurrency(cash.fromTrades)}</span>
        </div>
      </div>
    </Card>
  );
}
