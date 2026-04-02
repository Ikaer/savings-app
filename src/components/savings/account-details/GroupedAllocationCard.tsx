import React from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Button, Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { GroupAllocationSlice } from './types';

interface GroupedAllocationCardProps {
  data: GroupAllocationSlice[];
  hasConfiguredGroups: boolean;
  formatCurrency: (val: number) => string;
  onConfigureGroups: () => void;
}

const GROUP_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#fb7185'];

export default function GroupedAllocationCard({
  data,
  hasConfiguredGroups,
  formatCurrency,
  onConfigureGroups
}: GroupedAllocationCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <h2 className={sharedStyles.accountName}>Allocation by Group</h2>
        <Button variant="secondary" onClick={onConfigureGroups}>Configure Groups</Button>
      </div>

      {!hasConfiguredGroups ? (
        <div className={sharedStyles.chartEmpty}>
          Add at least one group to see your ETF/stock split.
        </div>
      ) : data.length === 0 ? (
        <div className={sharedStyles.chartEmpty}>
          No allocation data available.
        </div>
      ) : (
        <>
          <div className={sharedStyles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={140}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="currentValue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={GROUP_COLORS[index % GROUP_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
            {data.map((slice, index) => (
              <div
                key={slice.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  color: '#d1d5db',
                  fontSize: '0.875rem'
                }}
              >
                <span
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '999px',
                    background: GROUP_COLORS[index % GROUP_COLORS.length]
                  }}
                />
                <span style={{ color: '#f3f4f6' }}>{slice.name}</span>
                <span style={{ color: '#9ca3af' }}>{slice.percentage.toFixed(1)}%</span>
                <span>{formatCurrency(slice.currentValue)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
