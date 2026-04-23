import { parseISO, subHours } from "date-fns";

import { detectUnexpectedDrop } from "@/lib/anomaly-detection";
import { createAlertEvent } from "@/lib/storage";
import type { AlertEvent, AlertRule, AppState, MetricSnapshot } from "@/lib/types";

function hasRecentAlert(alerts: AlertEvent[], rule: AlertRule): boolean {
  const cutoff = subHours(new Date(), 8);

  return alerts.some((alert) => {
    if (alert.provider !== rule.provider || alert.metricKey !== rule.metricKey) {
      return false;
    }

    const createdAt = parseISO(alert.createdAt);
    return createdAt > cutoff;
  });
}

export function evaluateAlertRules(
  state: AppState,
  freshMetrics: MetricSnapshot[],
): AlertEvent[] {
  const generatedAlerts: AlertEvent[] = [];

  state.alertRules
    .filter((rule) => rule.enabled)
    .forEach((rule) => {
      const currentMetric = freshMetrics.find(
        (metric) =>
          metric.provider === rule.provider && metric.metricKey === rule.metricKey,
      );

      if (!currentMetric) {
        return;
      }

      const historyValues = state.metrics
        .filter(
          (metric) =>
            metric.provider === rule.provider && metric.metricKey === rule.metricKey,
        )
        .slice(-Math.max(rule.lookbackPoints, 3))
        .map((metric) => metric.value)
        .filter((value) => Number.isFinite(value));

      if (historyValues.length < 3) {
        return;
      }

      const detection = detectUnexpectedDrop(
        historyValues,
        currentMetric.value,
        rule.minDropPercent,
      );

      if (!detection.shouldAlert) {
        return;
      }

      const hasDuplicate =
        hasRecentAlert(state.alerts, rule) ||
        hasRecentAlert(generatedAlerts, rule);

      if (hasDuplicate) {
        return;
      }

      const severity =
        detection.dropPercent >= 35 || detection.zScore <= -3 ? "high" : "medium";

      generatedAlerts.push(
        createAlertEvent({
          provider: rule.provider,
          metricKey: rule.metricKey,
          baseline: detection.baseline,
          currentValue: currentMetric.value,
          dropPercent: Number(detection.dropPercent.toFixed(2)),
          zScore: Number(detection.zScore.toFixed(2)),
          severity,
          channel: rule.channel,
          target: rule.target,
          message: `${rule.provider} ${rule.metricKey} is down ${detection.dropPercent.toFixed(
            1,
          )}% versus baseline (${currentMetric.value.toFixed(2)} vs ${detection.baseline.toFixed(
            2,
          )}).`,
        }),
      );
    });

  return generatedAlerts;
}
