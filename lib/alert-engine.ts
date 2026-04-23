import cron from "node-cron";

import { collectMetricsFromIntegrations } from "@/lib/analytics-connectors";
import { detectMetricDrop } from "@/lib/anomaly-detection";
import {
  createAlertEvent,
  getActiveIntegrations,
  getAlertSettings,
  getMetricHistory,
  hasRecentAlert,
  storeMetricPoints,
} from "@/lib/database";
import { sendAlertNotifications } from "@/lib/notification-service";
import { METRIC_LABELS, type MetricKey, type MetricPoint, type MonitorRunResult } from "@/lib/types";

let schedulerStarted = false;

function extractLocalClock(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone || "UTC",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

function parseClockToMinutes(value: string | undefined) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function isQuietHoursActive(settings: {
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}) {
  const start = parseClockToMinutes(settings.quietHoursStart);
  const end = parseClockToMinutes(settings.quietHoursEnd);

  if (start === null || end === null) {
    return false;
  }

  const now = extractLocalClock(settings.timezone);

  if (start < end) {
    return now >= start && now < end;
  }

  return now >= start || now < end;
}

function aggregateMetricHistory(points: MetricPoint[]) {
  const grouped = new Map<string, number[]>();

  for (const point of points) {
    const date = point.capturedAt.slice(0, 10);

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }

    grouped.get(date)?.push(point.value);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      value: values.reduce((total, value) => total + value, 0) / values.length,
    }));
}

async function evaluateMetric(metricKey: MetricKey, thresholdPercent: number) {
  const historyPoints = await getMetricHistory(metricKey, 45);
  const aggregated = aggregateMetricHistory(historyPoints);

  if (aggregated.length < 6) {
    return null;
  }

  const values = aggregated.map((point) => point.value);
  const current = values.at(-1) ?? 0;
  const history = values.slice(0, -1);

  return {
    metricKey,
    current,
    detection: detectMetricDrop({
      history,
      current,
      thresholdPercent,
    }),
  };
}

export async function runMonitoringCycle(trigger: "manual" | "cron" | "dashboard" = "manual") {
  const detail: string[] = [`Monitor run started (${trigger}).`];

  const [settings, integrations] = await Promise.all([
    getAlertSettings(),
    getActiveIntegrations(),
  ]);

  if (integrations.length === 0) {
    detail.push("No active integrations configured.");

    return {
      fetchedPoints: 0,
      anomaliesDetected: 0,
      notificationsSent: 0,
      detail,
    } satisfies MonitorRunResult;
  }

  const collected = await collectMetricsFromIntegrations(
    integrations,
    Math.max(settings.lookbackDays, 7),
  );

  detail.push(...collected.detail);

  if (collected.points.length === 0) {
    detail.push("No metric points were fetched from integrations.");

    return {
      fetchedPoints: 0,
      anomaliesDetected: 0,
      notificationsSent: 0,
      detail,
    } satisfies MonitorRunResult;
  }

  await storeMetricPoints(collected.points);

  let anomaliesDetected = 0;
  let notificationsSent = 0;

  for (const metricKey of settings.monitoredMetrics) {
    const evaluation = await evaluateMetric(metricKey, settings.dropThresholdPercent);

    if (!evaluation) {
      detail.push(`Skipped ${metricKey}: not enough history for anomaly scoring.`);
      continue;
    }

    const { detection, current } = evaluation;

    if (!detection.isAnomaly || detection.confidence < settings.minConfidence) {
      continue;
    }

    const duplicate = await hasRecentAlert(metricKey, 12);
    if (duplicate) {
      detail.push(`Suppressed duplicate alert for ${metricKey}.`);
      continue;
    }

    anomaliesDetected += 1;

    const summary = `${METRIC_LABELS[metricKey]} dropped ${detection.dropPercent.toFixed(1)}% below baseline.`;
    const quietHoursActive = isQuietHoursActive(settings);

    let sentChannels: string[] = [];

    if (quietHoursActive) {
      detail.push(`Quiet hours active; alert for ${metricKey} stored without notifications.`);
    } else {
      const notifications = await sendAlertNotifications(settings, {
        metricKey,
        metricLabel: METRIC_LABELS[metricKey],
        currentValue: current,
        expectedValue: detection.expectedValue,
        dropPercent: detection.dropPercent,
        confidence: detection.confidence,
        summary,
      });

      sentChannels = notifications.sentChannels;
      notificationsSent += sentChannels.length;
      detail.push(...notifications.detail);
    }

    await createAlertEvent({
      metricKey,
      provider: "aggregated",
      expectedValue: detection.expectedValue,
      currentValue: current,
      dropPercent: detection.dropPercent,
      confidence: detection.confidence,
      summary,
      sentChannels,
    });
  }

  return {
    fetchedPoints: collected.points.length,
    anomaliesDetected,
    notificationsSent,
    detail,
  } satisfies MonitorRunResult;
}

export function ensureLocalMonitorScheduler() {
  if (schedulerStarted || process.env.ENABLE_LOCAL_CRON !== "true") {
    return schedulerStarted;
  }

  cron.schedule("*/30 * * * *", async () => {
    try {
      await runMonitoringCycle("cron");
    } catch {
      // Intentionally no throw: scheduler must stay alive even if one run fails.
    }
  });

  schedulerStarted = true;
  return schedulerStarted;
}
