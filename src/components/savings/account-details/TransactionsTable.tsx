import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import { SortableHeaderButton } from '@/components/shared/table';
import { TransactionsTableProps } from './types';
import styles from './TransactionsTable.module.css';

export default function TransactionsTable({
  transactions,
  transactionsSort,
  onToggleSort,
  formatCurrency,
  onEditTransaction,
  onDeleteTransaction
}: TransactionsTableProps) {
  const sortOptions: Array<{ key: TransactionsTableProps['transactionsSort']['key']; label: string }> = [
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total' },
    { key: 'asset', label: 'Asset' },
    { key: 'type', label: 'Type' }
  ];

  return (
    <div>
      <div className={styles.mobileSort}>
        {sortOptions.map(option => (
          <button
            key={option.key}
            type="button"
            className={`${styles.mobileSortButton} ${transactionsSort.key === option.key ? styles.mobileSortButtonActive : ''}`}
            onClick={() => onToggleSort(option.key)}
          >
            {option.label}{transactionsSort.key === option.key ? ` (${transactionsSort.direction})` : ''}
          </button>
        ))}
      </div>

      <div className={`${sharedStyles.tableContainer} ${styles.desktopTable}`}>
        <table className={sharedStyles.table}>
          <thead>
            <tr>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Date"
                  isActive={transactionsSort.key === 'date'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('date')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Type"
                  isActive={transactionsSort.key === 'type'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('type')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Asset"
                  isActive={transactionsSort.key === 'asset'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('asset')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Ticker"
                  isActive={transactionsSort.key === 'ticker'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('ticker')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="ISIN"
                  isActive={transactionsSort.key === 'isin'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('isin')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Quantity"
                  isActive={transactionsSort.key === 'quantity'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('quantity')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Price"
                  isActive={transactionsSort.key === 'price'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('price')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Fees"
                  isActive={transactionsSort.key === 'fees'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('fees')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="TTF"
                  isActive={transactionsSort.key === 'ttf'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('ttf')}
                />
              </th>
              <th className={sharedStyles.sortableHeader}>
                <SortableHeaderButton
                  label="Total"
                  isActive={transactionsSort.key === 'total'}
                  direction={transactionsSort.direction}
                  onClick={() => onToggleSort('total')}
                />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td style={{ color: t.type === 'Buy' ? '#60a5fa' : '#ef4444' }}>{t.type}</td>
                <td>{t.assetName}</td>
                <td>{t.ticker}</td>
                <td>{t.isin}</td>
                <td>{t.quantity}</td>
                <td>{formatCurrency(t.unitPrice)}</td>
                <td>{formatCurrency(t.fees)}</td>
                <td>{formatCurrency(t.ttf)}</td>
                <td>{formatCurrency(t.totalAmount)}</td>
                <td>
                  <div className={styles.rowActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditTransaction(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="primary-negative"
                      size="sm"
                      onClick={() => onDeleteTransaction(t)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {transactions.map(t => (
          <article key={`mobile-${t.id}`} className={styles.mobileCard}>
            <div className={styles.mobileCardHeader}>
              <div>
                <h3 className={styles.mobileAssetName}>{t.assetName}</h3>
                <span className={sharedStyles.ticker}>{t.ticker}</span>
              </div>
              <span className={styles.mobileType} style={{ color: t.type === 'Buy' ? '#60a5fa' : '#ef4444' }}>
                {t.type}
              </span>
            </div>

            <div className={styles.mobileMetaGrid}>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>Date</span>
                <span className={styles.mobileMetaValue}>{t.date}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>Quantity</span>
                <span className={styles.mobileMetaValue}>{t.quantity}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>Unit Price</span>
                <span className={styles.mobileMetaValue}>{formatCurrency(t.unitPrice)}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>Total</span>
                <span className={styles.mobileMetaValue}>{formatCurrency(t.totalAmount)}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>Fees</span>
                <span className={styles.mobileMetaValue}>{formatCurrency(t.fees)}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>TTF</span>
                <span className={styles.mobileMetaValue}>{formatCurrency(t.ttf)}</span>
              </div>
              <div className={styles.mobileMetaItem}>
                <span className={styles.mobileMetaLabel}>ISIN</span>
                <span className={styles.mobileMetaValue}>{t.isin}</span>
              </div>
            </div>

            <div className={styles.rowActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditTransaction(t)}
              >
                Edit Transaction
              </Button>
              <Button
                variant="primary-negative"
                size="sm"
                onClick={() => onDeleteTransaction(t)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
