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
  const accountTotal = investedValue + cash.balance;
  const dragPct = accountTotal > 0 ? (cash.balance / accountTotal) * 100 : 0;

  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Cash</h2>
      <div className={sharedStyles.statsGrid} style={{ marginTop: '1rem' }}>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>Cash Balance</span>
          <span className={sharedStyles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(cash.balance)}</span>
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
