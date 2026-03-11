import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import styles from './PositionsTable.module.css';
import { PositionsTableProps } from './types';
import SparklineChart from './SparklineChart';
import { SortableHeaderButton } from '@/components/shared/table';

export default function PositionsTable({
  positions,
  positionsSort,
  onToggleSort,
  sparklineData,
  formatCurrency,
  formatPercent,
  onOpenAssetCharts
}: PositionsTableProps) {
  const sortOptions: Array<{ key: PositionsTableProps['positionsSort']['key']; label: string }> = [
    { key: 'asset', label: 'Asset' },
    { key: 'value', label: 'Value' },
    { key: 'gainLoss', label: 'Gain/Loss' },
    { key: 'gainLossPct', label: 'Gain/Loss %' }
  ];

  return (
    <div>
      <div className={styles.mobileSort}>
        {sortOptions.map(option => (
          <button
            key={option.key}
            type="button"
            className={`${styles.mobileSortButton} ${positionsSort.key === option.key ? styles.mobileSortButtonActive : ''}`}
            onClick={() => onToggleSort(option.key)}
          >
            {option.label}{positionsSort.key === option.key ? ` (${positionsSort.direction})` : ''}
          </button>
        ))}
      </div>

      <div className={`${sharedStyles.tableContainer} ${styles.desktopTable}`}>
        <table className={sharedStyles.table}>
          <thead>
            <tr>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Asset"
                  isActive={positionsSort.key === 'asset'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('asset')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Quantity"
                  isActive={positionsSort.key === 'quantity'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('quantity')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Avg. Price"
                  isActive={positionsSort.key === 'avgPrice'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('avgPrice')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Curr. Price"
                  isActive={positionsSort.key === 'currentPrice'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('currentPrice')}
                />
              </th>
              <th>Diff</th>
              <th>Market Trend</th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Value"
                  isActive={positionsSort.key === 'value'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('value')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Gain/Loss"
                  isActive={positionsSort.key === 'gainLoss'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('gainLoss')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Gain/Loss %"
                  isActive={positionsSort.key === 'gainLossPct'}
                  direction={positionsSort.direction}
                  onClick={() => onToggleSort('gainLossPct')}
                />
              </th>
              <th>Charts</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => (
              <tr key={pos.ticker}>
                <td>
                  <strong>{pos.name}</strong>
                  <br />
                  <span className={sharedStyles.ticker}>{pos.ticker}</span>
                </td>
                <td>{pos.quantity.toFixed(2)}</td>
                <td>{formatCurrency(pos.averagePurchasePrice)}</td>
                <td>{formatCurrency(pos.currentPrice)}</td>
                <td className={(pos.currentPrice - pos.averagePurchasePrice) >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                  {(pos.currentPrice - pos.averagePurchasePrice) >= 0 ? '+' : ''}{formatCurrency(pos.currentPrice - pos.averagePurchasePrice)}
                </td>
                <td className={styles.sparklineCell}>
                  {pos.isin && sparklineData[pos.isin]?.length ? (
                    <SparklineChart
                      points={sparklineData[pos.isin]}
                      averagePurchasePrice={pos.averagePurchasePrice}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <span className={styles.sparklineEmpty}>—</span>
                  )}
                </td>
                <td>{formatCurrency(pos.currentValue)}</td>
                <td className={pos.unrealizedGainLoss >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                  {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)}
                </td>
                <td className={pos.unrealizedGainLossPercentage >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                  {pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
                </td>
                <td>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenAssetCharts(pos.isin || null)}
                  >
                    All charts
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {positions.map(pos => {
          const priceDiff = pos.currentPrice - pos.averagePurchasePrice;
          const priceDiffPositive = priceDiff >= 0;
          const hasSparkline = !!(pos.isin && sparklineData[pos.isin]?.length);

          return (
            <article key={`mobile-${pos.ticker}`} className={styles.mobileCard}>
              <div className={styles.mobileCardHeader}>
                <div>
                  <h3 className={styles.mobileAssetName}>{pos.name}</h3>
                  <span className={sharedStyles.ticker}>{pos.ticker}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAssetCharts(pos.isin || null)}
                >
                  Charts
                </Button>
              </div>

              <div className={styles.mobileMetaGrid}>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Quantity</span>
                  <span className={styles.mobileMetaValue}>{pos.quantity.toFixed(2)}</span>
                </div>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Value</span>
                  <span className={styles.mobileMetaValue}>{formatCurrency(pos.currentValue)}</span>
                </div>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Avg. Price</span>
                  <span className={styles.mobileMetaValue}>{formatCurrency(pos.averagePurchasePrice)}</span>
                </div>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Curr. Price</span>
                  <span className={styles.mobileMetaValue}>{formatCurrency(pos.currentPrice)}</span>
                </div>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Price Diff</span>
                  <span className={`${styles.mobileMetaValue} ${priceDiffPositive ? sharedStyles.positive : sharedStyles.negative}`}>
                    {priceDiffPositive ? '+' : ''}{formatCurrency(priceDiff)}
                  </span>
                </div>
                <div className={styles.mobileMetaItem}>
                  <span className={styles.mobileMetaLabel}>Gain/Loss</span>
                  <span className={`${styles.mobileMetaValue} ${pos.unrealizedGainLoss >= 0 ? sharedStyles.positive : sharedStyles.negative}`}>
                    {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)} ({pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)})
                  </span>
                </div>
              </div>

              <div>
                {hasSparkline ? (
                  <SparklineChart
                    points={sparklineData[pos.isin!]}
                    averagePurchasePrice={pos.averagePurchasePrice}
                    formatCurrency={formatCurrency}
                  />
                ) : (
                  <span className={styles.sparklineEmpty}>No market trend data.</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
