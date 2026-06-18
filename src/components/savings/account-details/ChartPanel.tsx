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
import styles from './ChartPanel.module.css';
import { HistoryChartPoint, HistoryMetricPoint } from './types';
import { buildGainLossForecast } from './helpers/forecast';

type ChartMetric = 'value' | 'gainLoss' | 'projection';
type ChartPeriod = '1M' | '3M' | '6M' | 'All';

interface ChartPanelProps {
  loading: boolean;
  historyData: HistoryChartPoint[];
  metrics: HistoryMetricPoint[];
  formatCurrency: (val: number) => string;
}

const METRIC_OPTIONS: { id: ChartMetric; label: string }[] = [
  { id: 'value', label: 'Value' },
  { id: 'gainLoss', label: 'Gain/Loss %' },
  { id: 'projection', label: 'Projection' }
];

const PERIOD_OPTIONS: { id: ChartPeriod; label: string; days: number | null }[] = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 180 },
  { id: 'All', label: 'All', days: null }
];

// Forecast horizon (in days) for the projection metric. "All" has no historical-window meaning
// for a forward projection, so it maps to the longest horizon — same as 6M.
const PROJECTION_HORIZON: Record<ChartPeriod, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  All: 180
};

/**
 * Filter time-series points to the trailing window, anchored to the most recent point's date
 * rather than "today" — snapshots can lag, so a today-relative cutoff could show an empty window.
 */
function filterByPeriod<T extends { date: string }>(points: T[], days: number | null): T[] {
  if (days === null || points.length === 0) return points;

  const times = points
    .map(point => new Date(point.date).getTime())
    .filter(time => !Number.isNaN(time));
  if (!times.length) return points;

  const lastTime = Math.max(...times);
  const cutoff = lastTime - days * 24 * 60 * 60 * 1000;
  return points.filter(point => {
    const time = new Date(point.date).getTime();
    return Number.isNaN(time) || time >= cutoff;
  });
}

const tooltipStyle = { background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' };
const labelStyle = { color: '#9ca3af' };

export default function ChartPanel({ loading, historyData, metrics, formatCurrency }: ChartPanelProps) {
  const [metric, setMetric] = useState<ChartMetric>('value');
  const [period, setPeriod] = useState<ChartPeriod>('All');

  const periodDays = useMemo(() => {
    return PERIOD_OPTIONS.find(option => option.id === period)?.days ?? null;
  }, [period]);

  const windowedData = useMemo(() => {
    return filterByPeriod(historyData, periodDays);
  }, [historyData, periodDays]);

  // The regression must always see the full history — never the period-filtered slice — or the
  // projection silently degrades. The period acts as the forecast horizon in projection mode.
  const forecast = useMemo(() => {
    return buildGainLossForecast(metrics, PROJECTION_HORIZON[period]);
  }, [metrics, period]);

  const canForecast = forecast.points.some(point => typeof point.projectedGainLoss === 'number');

  const renderBody = () => {
    if (loading) {
      return <div className={sharedStyles.chartEmpty}>Loading history...</div>;
    }

    if (metric === 'projection') {
      if (metrics.length < 8) {
        return <div className={sharedStyles.chartEmpty}>At least 8 historical points are needed for a projection.</div>;
      }
      if (!canForecast) {
        return <div className={sharedStyles.chartEmpty}>Projection unavailable for current data.</div>;
      }
      return (
        <>
          <div className={styles.meta}>Confidence score: {forecast.confidence}%</div>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={200}>
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
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
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
        </>
      );
    }

    if (windowedData.length === 0) {
      return <div className={sharedStyles.chartEmpty}>No historical data available.</div>;
    }

    if (metric === 'gainLoss') {
      return (
        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={200}>
            <LineChart data={windowedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={value => `${Number(value).toFixed(2)}%`}
                width={70}
                domain={([dataMin, dataMax]) => {
                  const range = Math.max(dataMax - dataMin, 0.1);
                  return [dataMin - range * 0.1, dataMax + range * 0.1];
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(value) => `${Number(value ?? 0).toFixed(2)}%`}
              />
              <Line
                type="monotone"
                dataKey="gainLossPct"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={200}>
          <LineChart data={windowedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={value => formatCurrency(Number(value))}
              width={90}
              domain={([dataMin, dataMax]) => {
                const range = Math.max(dataMax - dataMin, 1);
                return [dataMin - range * 0.05, dataMax + range * 0.05];
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              formatter={(value) => formatCurrency(Number(value ?? 0))}
            />
            <Line
              type="monotone"
              dataKey="totalInvested"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="currentValue"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card>
      <div className={styles.panelHeader}>
        <div className={styles.controls} role="group" aria-label="Chart metric">
          {METRIC_OPTIONS.map(option => (
            <Button
              key={option.id}
              variant={metric === option.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMetric(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className={styles.controls} role="group" aria-label="Chart period">
          {PERIOD_OPTIONS.map(option => (
            <Button
              key={option.id}
              variant={period === option.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {renderBody()}
    </Card>
  );
}
