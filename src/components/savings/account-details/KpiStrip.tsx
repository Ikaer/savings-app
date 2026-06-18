import React from 'react';
import { Card } from '@/components/shared';
import styles from './KpiStrip.module.css';
import { AccountSummary } from '@/models/savings';

interface KpiStripProps {
  summary: AccountSummary;
  /** PEA-only KPIs (Cash, Dividends) are shown only for PEA accounts. */
  isPea: boolean;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function KpiStrip({ summary, isPea, formatCurrency, formatPercent }: KpiStripProps) {
  const gainClass = summary.totalGainLoss >= 0 ? styles.positive : styles.negative;
  const xirrClass = summary.xirr >= 0 ? styles.positive : styles.negative;

  // A negative derived cash balance is impossible in reality — it only means deposits weren't
  // fully recorded. Floor the headline at 0; the component breakdown lives in the tooltip.
  const cash = isPea ? summary.cash : undefined;
  const cashBalance = cash ? Math.max(0, cash.balance) : 0;
  // A negative raw balance means recorded deposits don't cover the stocks bought — usually a
  // missing opening deposit. Surface the shortfall so the floored 0 isn't mistaken for a bug.
  const cashShortfall = cash && cash.balance < 0 ? -cash.balance : 0;
  const cashTooltip = cash
    ? [
        `Net transfers in: ${formatCurrency(cash.fromDeposits)}`,
        `Dividends received: ${formatCurrency(cash.fromDividends)}`,
        `Invested in stocks (net): ${formatCurrency(cash.fromTrades)}`,
        ...(cashShortfall > 0
          ? [`⚠ Unfunded by ${formatCurrency(cashShortfall)} — record an opening deposit to fix.`]
          : [])
      ].join('\n')
    : undefined;

  const dividends = isPea ? summary.dividends : undefined;
  const currentYear = new Date().getFullYear();
  const dividendsThisYear = dividends?.byYear.find(y => y.year === currentYear)?.amount ?? 0;

  return (
    <Card>
      <div className={styles.strip}>
        <div className={styles.item}>
          <span className={styles.label}>Current Value</span>
          <span className={styles.value}>{formatCurrency(summary.currentValue)}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Total Gain/Loss</span>
          <span className={`${styles.value} ${gainClass}`}>
            {summary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>XIRR (Annualized)</span>
          <span className={`${styles.value} ${xirrClass}`}>{formatPercent(summary.xirr * 100)}</span>
        </div>
        {cash && (
          <div className={styles.item}>
            <span className={styles.label}>Cash</span>
            <span className={`${styles.value}${cashShortfall > 0 ? ` ${styles.negative}` : ''}`} title={cashTooltip}>
              {formatCurrency(cashBalance)}{cashShortfall > 0 ? ' ⚠' : ''}
            </span>
          </div>
        )}
        {dividends && (
          <div className={styles.item}>
            <span className={styles.label}>Dividends</span>
            <span className={styles.value} title={`This year (${currentYear}): ${formatCurrency(dividendsThisYear)}`}>
              {formatCurrency(dividends.total)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
