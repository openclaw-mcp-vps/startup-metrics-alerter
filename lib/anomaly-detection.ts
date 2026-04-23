interface DetectDropInput {
  history: number[];
  current: number;
  thresholdPercent: number;
}

export interface DropDetectionResult {
  expectedValue: number;
  dropPercent: number;
  zScore: number;
  confidence: number;
  isAnomaly: boolean;
  reason: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function stdDev(values: number[], avg: number) {
  if (values.length < 2) {
    return 0;
  }

  const variance =
    values.reduce((total, value) => total + (value - avg) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

function ewma(values: number[], alpha = 0.35) {
  if (values.length === 0) {
    return 0;
  }

  return values.slice(1).reduce((acc, value) => alpha * value + (1 - alpha) * acc, values[0]);
}

export function detectMetricDrop({
  history,
  current,
  thresholdPercent,
}: DetectDropInput): DropDetectionResult {
  const cleaned = history.filter((value) => Number.isFinite(value) && value >= 0);

  if (cleaned.length < 5) {
    const baseline = cleaned.length > 0 ? mean(cleaned) : current;
    const drop = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0;

    return {
      expectedValue: baseline,
      dropPercent: clamp(drop, -100, 100),
      zScore: 0,
      confidence: cleaned.length / 10,
      isAnomaly: false,
      reason: "Insufficient history to score anomaly reliably.",
    };
  }

  const weightedBaseline = ewma(cleaned);
  const rollingAverage = mean(cleaned);
  const expectedValue = weightedBaseline * 0.7 + rollingAverage * 0.3;

  const baselineStdDev = stdDev(cleaned, rollingAverage);
  const zScore = baselineStdDev > 0 ? (current - expectedValue) / baselineStdDev : -4;
  const dropPercent = expectedValue > 0 ? ((expectedValue - current) / expectedValue) * 100 : 0;

  const sampleStrength = clamp(cleaned.length / 28, 0.2, 1);
  const zStrength = clamp(Math.abs(Math.min(0, zScore)) / 3.5, 0, 1);
  const dropStrength = clamp(dropPercent / Math.max(thresholdPercent, 1), 0, 1.2);
  const confidence = clamp(sampleStrength * 0.35 + zStrength * 0.35 + dropStrength * 0.3, 0, 0.99);

  const isAnomaly = dropPercent >= thresholdPercent && zScore <= -1.1 && confidence >= 0.6;

  return {
    expectedValue,
    dropPercent,
    zScore,
    confidence,
    isAnomaly,
    reason: isAnomaly
      ? `Observed ${dropPercent.toFixed(1)}% drop vs adaptive baseline (${zScore.toFixed(2)}σ).`
      : "Metric is within expected variance.",
  };
}
