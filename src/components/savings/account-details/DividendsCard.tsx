import React from 'react';
import { Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { DividendSummary } from '@/models/savings';

interface DividendsCardProps {
  dividends: DividendSummary;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function DividendsCard({ dividends, formatCurrency, formatPercent }: DividendsCardProps) {
  const hasDividends = dividends.total > 0;
  const currentYear = new Date().getFullYear();
  const thisYear = dividends.byYear.find(y => y.year === currentYear)?.amount ?? 0;

  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Dividends</h2>

      {!hasDividends ? (
        <p style={{ color: '#9ca3af', marginTop: '1rem' }}>
          No dividends recorded yet. Add a transaction of type <strong>Dividend</strong> to track income here.
        </p>
      ) : (
        <>
          <div className={sharedStyles.statsGrid} style={{ marginTop: '1rem' }}>
            <div className={sharedStyles.statItem}>
              <span className={sharedStyles.statLabel}>Total Received</span>
              <span className={sharedStyles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(dividends.total)}</span>
            </div>
            <div className={sharedStyles.statItem}>
              <span className={sharedStyles.statLabel}>This Year ({currentYear})</span>
              <span className={sharedStyles.statValue}>{formatCurrency(thisYear)}</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.35rem' }}>
              <span>Asset</span>
              <span>Received · Yield on cost</span>
            </div>
            {dividends.byAsset.map(asset => (
              <div
                key={asset.ticker || asset.isin || asset.name}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}
              >
                <span>{asset.name || asset.ticker}</span>
                <span>
                  {formatCurrency(asset.total)}
                  {asset.costBasis > 0 && (
                    <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                      ({formatPercent(asset.yieldOnCost * 100)})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
