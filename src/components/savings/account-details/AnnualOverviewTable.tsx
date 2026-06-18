import React from 'react';
import { Button } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { AnnualOverviewRow } from './types';

interface AnnualOverviewTableProps {
  rows: AnnualOverviewRow[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onEdit: (year: number, endValue?: number) => void;
}

export default function AnnualOverviewTable({ rows, formatCurrency, formatPercent, onEdit }: AnnualOverviewTableProps) {
  if (rows.length === 0) {
    return (
      <div className={sharedStyles.emptyState} style={{ padding: '1.5rem 0' }}>
        No annual data available.
      </div>
    );
  }

  return (
    <div className={sharedStyles.tableContainer}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th>Year</th>
            <th>End Value</th>
            <th>XIRR</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(entry => (
            <tr key={entry.year}>
              <td>{entry.year}</td>
              <td>{entry.endValue === undefined ? '—' : formatCurrency(entry.endValue)}</td>
              <td className={entry.xirr === undefined ? '' : (entry.xirr >= 0 ? sharedStyles.positive : sharedStyles.negative)}>
                {entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`}
              </td>
              <td style={{ textAlign: 'right' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(entry.year, entry.endValue)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
