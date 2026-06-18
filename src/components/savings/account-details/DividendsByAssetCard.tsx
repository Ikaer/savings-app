import React from 'react';
import { Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { DividendSummary } from '@/models/savings';

interface DividendsByAssetCardProps {
  dividends: DividendSummary;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function DividendsByAssetCard({ dividends, formatCurrency, formatPercent }: DividendsByAssetCardProps) {
  const hasDividends = dividends.total > 0;

  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Dividends by asset</h2>

      {!hasDividends ? (
        <p style={{ color: '#9ca3af', marginTop: '1rem' }}>
          No dividends recorded yet. Add a transaction of type <strong>Dividend</strong> to track income here.
        </p>
      ) : (
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
      )}
    </Card>
  );
}
