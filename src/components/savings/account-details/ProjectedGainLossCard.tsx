import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, Button } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { HistoryMetricPoint } from './types';
import { buildGainLossForecast } from './helpers/forecast';

interface ProjectedGainLossCardProps {
  loading: boolean;
  metrics: HistoryMetricPoint[];
  formatCurrency: (val: number) => string;
}

type ForecastHorizon = 30 | 90 | 180;

const HORIZON_OPTIONS: { label: string; value: ForecastHorizon }[] = [
  { label: '1M', value: 30 },
  { label: '3M', value: 90 },
  { label: '6M', value: 180 }
];

export default function ProjectedGainLossCard({
  loading,
  metrics,
  formatCurrency
}: ProjectedGainLossCardProps) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(90);

  const forecast = useMemo(() => buildGainLossForecast(metrics, horizon), [metrics, horizon]);
  const canForecast = forecast.points.some(point => typeof point.projectedGainLoss === 'number');

  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Projected Total Gain/Loss</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {HORIZON_OPTIONS.map(option => (
          <Button
            key={option.value}
            variant={horizon === option.value ? 'primary' : 'secondary'}
            onClick={() => setHorizon(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div style={{ marginTop: '0.75rem', color: '#9ca3af', fontSize: '0.8rem' }}>
        Confidence score: {forecast.confidence}%
      </div>
      {loading ? (
        <div className={sharedStyles.chartEmpty}>Loading history...</div>
      ) : metrics.length < 8 ? (
        <div className={sharedStyles.chartEmpty}>At least 8 historical points are needed for a projection.</div>
      ) : !canForecast ? (
        <div className={sharedStyles.chartEmpty}>Projection unavailable for current data.</div>
      ) : (
        <div className={sharedStyles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={140}>
            <LineChart data={forecast.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={value => formatCurrency(Number(value))}
                width={90}
                domain={([dataMin, dataMax]) => {
                  const range = Math.max(dataMax - dataMin, 1);
                  return [dataMin - range * 0.1, dataMax + range * 0.1];
                }}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value, name) => {
                  if (typeof value !== 'number') return ['-', String(name)];
                  if (name === 'projectedLowerBound') return [formatCurrency(value), 'Projected lower'];
                  if (name === 'projectedUpperBound') return [formatCurrency(value), 'Projected upper'];
                  if (name === 'projectedGainLoss') return [formatCurrency(value), 'Projected'];
                  return [formatCurrency(value), 'Historical'];
                }}
              />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="projectedUpperBound"
                stroke="none"
                fill="#22c55e"
                fillOpacity={0.08}
                isAnimationActive={false}
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="projectedLowerBound"
                stroke="none"
                fill="#111827"
                fillOpacity={1}
                isAnimationActive={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="historicalGainLoss"
                name="Historical"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="projectedGainLoss"
                name="Projected"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
