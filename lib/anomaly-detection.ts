import { mean, standardDeviation } from "simple-statistics";

export interface AnomalyDetectionResult {
  shouldAlert: boolean;
  baseline: number;
  dropPercent: number;
  zScore: number;
  lowerBound: number;
}

export function detectUnexpectedDrop(
  historyValues: number[],
  currentValue: number,
  minDropPercent: number,
): AnomalyDetectionResult {
  if (historyValues.length === 0) {
    return {
      shouldAlert: false,
      baseline: currentValue,
      dropPercent: 0,
      zScore: 0,
      lowerBound: currentValue,
    };
  }

  const baseline = mean(historyValues);
  const stdev = historyValues.length > 1 ? standardDeviation(historyValues) : 0;

  if (baseline <= 0) {
    return {
      shouldAlert: false,
      baseline,
      dropPercent: 0,
      zScore: 0,
      lowerBound: baseline,
    };
  }

  const dropPercent = ((baseline - currentValue) / baseline) * 100;
  const zScore = stdev > 0 ? (currentValue - baseline) / stdev : 0;

  const dynamicLowerBound = Math.min(
    baseline * (1 - minDropPercent / 100),
    baseline - Math.max(stdev * 2, baseline * 0.1),
  );

  const shouldAlert = currentValue < dynamicLowerBound && dropPercent >= minDropPercent;

  return {
    shouldAlert,
    baseline,
    dropPercent,
    zScore,
    lowerBound: dynamicLowerBound,
  };
}
