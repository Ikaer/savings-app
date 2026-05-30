import { GainLossForecastPoint, HistoryMetricPoint } from '../types';

interface GainLossForecastResult {
  points: GainLossForecastPoint[];
  confidence: number;
}

interface RegressionModel {
  intercept: number;
  slopePerDay: number;
  residualStdDev: number;
  r2: number;
  meanX: number;
  sumSquaredXDiff: number;
}

function toDayOffset(date: string, baseDate: Date): number {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const diffMs = parsed.getTime() - baseDate.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildRegressionModel(history: HistoryMetricPoint[]): RegressionModel | null {
  if (history.length < 8) {
    return null;
  }

  const baseDate = new Date(history[0].date);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const x = history.map(point => toDayOffset(point.date, baseDate));
  const y = history.map(point => point.totalGainLoss);

  const count = x.length;
  const meanX = x.reduce((sum, value) => sum + value, 0) / count;
  const meanY = y.reduce((sum, value) => sum + value, 0) / count;

  const numerator = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const denominator = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);

  if (denominator <= 0) {
    return null;
  }

  const slopePerDay = numerator / denominator;
  const intercept = meanY - slopePerDay * meanX;

  const residuals = x.map((value, index) => y[index] - (intercept + slopePerDay * value));
  const ssRes = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const ssTot = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const residualStdDev = Math.sqrt(ssRes / Math.max(count - 2, 1));

  return {
    intercept,
    slopePerDay,
    residualStdDev,
    r2,
    meanX,
    sumSquaredXDiff: denominator
  };
}

function estimateProjectionError(
  xValue: number,
  pointCount: number,
  model: RegressionModel
): number {
  if (model.sumSquaredXDiff <= 0) {
    return model.residualStdDev;
  }

  const leverage = 1 + (1 / pointCount) + ((xValue - model.meanX) ** 2 / model.sumSquaredXDiff);
  return model.residualStdDev * Math.sqrt(Math.max(leverage, 1));
}

export function buildGainLossForecast(
  history: HistoryMetricPoint[],
  horizonDays: number
): GainLossForecastResult {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const model = buildRegressionModel(sorted);

  const points: GainLossForecastPoint[] = sorted.map(point => ({
    date: point.date,
    historicalGainLoss: point.totalGainLoss
  }));

  if (!model || sorted.length === 0 || horizonDays <= 0) {
    return { points, confidence: 0 };
  }

  const baseDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const lastOffset = toDayOffset(sorted[sorted.length - 1].date, baseDate);

  const forecastSteps = Math.min(Math.max(Math.floor(horizonDays / 7), 4), 26);
  const dayStep = Math.max(Math.floor(horizonDays / forecastSteps), 1);

  for (let stepIndex = 1; stepIndex <= forecastSteps; stepIndex += 1) {
    const projectedOffset = lastOffset + dayStep * stepIndex;
    const projectedDate = new Date(lastDate);
    projectedDate.setDate(projectedDate.getDate() + dayStep * stepIndex);

    const projectedGainLoss = model.intercept + model.slopePerDay * projectedOffset;
    const projectionError = estimateProjectionError(projectedOffset, sorted.length, model);
    const margin = projectionError * 1.28; // ~80% confidence interval for a readable band

    points.push({
      date: projectedDate.toISOString().slice(0, 10),
      projectedGainLoss,
      projectedLowerBound: projectedGainLoss - margin,
      projectedUpperBound: projectedGainLoss + margin
    });
  }

  const dataCoverageScore = clamp((sorted.length / 35) * 100, 0, 100);
  const fitScore = clamp(model.r2 * 100, 0, 100);
  const confidence = Math.round(clamp(dataCoverageScore * 0.55 + fitScore * 0.45, 0, 95));

  return { points, confidence };
}
