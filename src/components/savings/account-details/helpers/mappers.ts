import { AssetPosition, PEAConfig } from '@/models/savings';
import {
  AssetChartPoint,
  AssetMetaInfo,
  AssetSparklinePoint,
  GroupAllocationSlice,
  HistoryChartPoint,
  HistoryMetricPoint,
  HistoricalAssetRecord,
  HistoricalAccountRecord
} from '../types';

export function mapHistoryChartData(history: HistoricalAccountRecord[]): HistoryChartPoint[] {
  return history.map(entry => {
    const gainLossPct = entry.totalInvested > 0
      ? (entry.totalGainLoss / entry.totalInvested) * 100
      : 0;
    return {
      date: entry.timestamp.slice(0, 10),
      totalInvested: entry.totalInvested,
      currentValue: entry.currentValue,
      gainLossPct
    };
  });
}

export function mapHistoryMetrics(history: HistoricalAccountRecord[]): HistoryMetricPoint[] {
  return history.map(entry => ({
    date: entry.timestamp.slice(0, 10),
    totalInvested: entry.totalInvested,
    currentValue: entry.currentValue,
    totalGainLoss: entry.totalGainLoss,
    xirr: entry.xirr,
    currentYearXirr: entry.currentYearXirr
  }));
}

export function mapAssetSparklineData(
  assetHistory: Record<string, HistoricalAssetRecord[]>
): Record<string, AssetSparklinePoint[]> {
  const map: Record<string, AssetSparklinePoint[]> = {};
  Object.entries(assetHistory).forEach(([isin, entries]) => {
    map[isin] = entries.map(entry => ({
      date: entry.timestamp.slice(0, 10),
      value: entry.currentPrice
    }));
  });
  return map;
}

export function mapAssetChartData(
  assetHistory: Record<string, HistoricalAssetRecord[]>
): Record<string, AssetChartPoint[]> {
  const map: Record<string, AssetChartPoint[]> = {};
  Object.entries(assetHistory).forEach(([isin, entries]) => {
    map[isin] = entries.map(entry => ({
      date: entry.timestamp.slice(0, 10),
      currentPrice: entry.currentPrice,
      currentValue: entry.currentValue,
      unrealizedGainLoss: entry.unrealizedGainLoss,
      unrealizedGainLossPercentage: entry.unrealizedGainLossPercentage
    }));
  });
  return map;
}

export function getActiveAssetInfo(
  activeAssetIsin: string | null,
  positions?: AssetPosition[]
): AssetMetaInfo | null {
  if (!activeAssetIsin || !positions) return null;
  const match = positions.find(pos => pos.isin === activeAssetIsin);
  return match ? { name: match.name, isin: match.isin, ticker: match.ticker } : null;
}

export function mapGroupedAllocationData(
  positions: AssetPosition[],
  config?: PEAConfig
): GroupAllocationSlice[] {
  if (!positions.length) return [];

  const totalCurrentValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
  if (totalCurrentValue <= 0) return [];

  const groups = config?.allocationGroups ?? [];
  if (!groups.length) return [];

  const normalizedGroups = groups.map(group => ({
    name: group.name,
    tickers: (group.tickers ?? []).map(value => value.trim().toUpperCase()),
    isins: (group.isins ?? []).map(value => value.trim().toUpperCase())
  }));

  const groupedSlices = normalizedGroups.map(group => ({
    name: group.name,
    currentValue: 0,
    matchedAssets: [] as string[]
  }));

  let remainderValue = 0;

  positions.forEach(position => {
    if (position.currentValue <= 0) return;

    const ticker = position.ticker.trim().toUpperCase();
    const isin = position.isin.trim().toUpperCase();
    const targetIndex = normalizedGroups.findIndex(group => {
      return group.tickers.includes(ticker) || group.isins.includes(isin);
    });

    if (targetIndex >= 0) {
      groupedSlices[targetIndex].currentValue += position.currentValue;
      groupedSlices[targetIndex].matchedAssets.push(position.ticker);
      return;
    }

    remainderValue += position.currentValue;
  });

  const nonEmptyGroups: GroupAllocationSlice[] = groupedSlices
    .filter(group => group.currentValue > 0)
    .map(group => ({
      ...group,
      percentage: (group.currentValue / totalCurrentValue) * 100
    }));

  if (remainderValue > 0) {
    nonEmptyGroups.push({
      name: config?.allocationUngroupedLabel || 'Other assets',
      currentValue: remainderValue,
      percentage: (remainderValue / totalCurrentValue) * 100,
      matchedAssets: [],
      isRemainder: true
    });
  }

  return nonEmptyGroups;
}

