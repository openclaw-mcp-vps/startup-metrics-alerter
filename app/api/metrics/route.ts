import { NextRequest, NextResponse } from "next/server";

import { ensureLocalMonitorScheduler, runMonitoringCycle } from "@/lib/alert-engine";
import {
  getDashboardMetricSummaries,
  getRecentMetricPoints,
  listAlertEvents,
  listIntegrations,
} from "@/lib/database";
import { ensurePaidAccess } from "@/lib/request-auth";

function buildTrendRows(points: Awaited<ReturnType<typeof getRecentMetricPoints>>) {
  const grouped = new Map<string, Record<string, number[]>>();

  for (const point of points) {
    const date = point.capturedAt.slice(0, 10);

    if (!grouped.has(date)) {
      grouped.set(date, {});
    }

    const metricBucket = grouped.get(date);
    if (!metricBucket) {
      continue;
    }

    if (!metricBucket[point.metricKey]) {
      metricBucket[point.metricKey] = [];
    }

    metricBucket[point.metricKey].push(point.value);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => {
      const row: Record<string, string | number> = { date };

      for (const [metricKey, metricValues] of Object.entries(values)) {
        row[metricKey] =
          metricValues.reduce((total, value) => total + value, 0) / Math.max(metricValues.length, 1);
      }

      return row;
    });
}

export async function GET(request: NextRequest) {
  const authError = ensurePaidAccess(request);
  if (authError) {
    return authError;
  }

  ensureLocalMonitorScheduler();

  const daysParam = request.nextUrl.searchParams.get("days");
  const refreshParam = request.nextUrl.searchParams.get("refresh");
  const days = Math.min(Math.max(Number(daysParam) || 14, 7), 90);

  if (refreshParam === "true") {
    await runMonitoringCycle("dashboard");
  }

  const [summaries, points, alerts, integrations] = await Promise.all([
    getDashboardMetricSummaries(days),
    getRecentMetricPoints(days),
    listAlertEvents(12),
    listIntegrations(),
  ]);

  return NextResponse.json({
    summaries,
    trend: buildTrendRows(points),
    alerts,
    integrations,
  });
}
