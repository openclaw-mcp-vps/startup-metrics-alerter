import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertSettings } from "@/components/AlertSettings";
import { IntegrationSetup } from "@/components/IntegrationSetup";
import { MetricCard } from "@/components/MetricCard";
import { MetricTrendChart } from "@/components/MetricTrendChart";
import { runMonitoringCycle } from "@/lib/alert-engine";
import {
  getAlertSettings,
  getDashboardMetricSummaries,
  getRecentMetricPoints,
  listAlertEvents,
  listIntegrations,
} from "@/lib/database";
import { getAccessPayloadFromCookies } from "@/lib/paywall";
import { METRIC_KEYS, METRIC_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildTrendRows(points: Awaited<ReturnType<typeof getRecentMetricPoints>>) {
  const grouped = new Map<string, Record<string, number[]>>();

  for (const point of points) {
    const date = point.capturedAt.slice(0, 10);

    if (!grouped.has(date)) {
      grouped.set(date, {});
    }

    const metricValues = grouped.get(date);
    if (!metricValues) {
      continue;
    }

    if (!metricValues[point.metricKey]) {
      metricValues[point.metricKey] = [];
    }

    metricValues[point.metricKey].push(point.value);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => {
      const row: Record<string, string | number> = { date };

      for (const [metricKey, bucket] of Object.entries(values)) {
        row[metricKey] = bucket.reduce((sum, value) => sum + value, 0) / Math.max(bucket.length, 1);
      }

      return row;
    });
}

function formatMetric(metricKey: keyof typeof METRIC_LABELS, value: number) {
  if (metricKey === "mrr") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (metricKey === "activation_rate" || metricKey === "trial_to_paid" || metricKey === "churn_rate") {
    return `${value.toFixed(2)}%`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getAccessPayloadFromCookies();

  if (!access) {
    redirect("/dashboard/unlock");
  }

  const params = (await searchParams) ?? {};
  const refreshRequested = params.refresh === "true";

  if (refreshRequested) {
    await runMonitoringCycle("dashboard");
  }

  const [summaries, settings, integrations, alerts, points] = await Promise.all([
    getDashboardMetricSummaries(21),
    getAlertSettings(),
    listIntegrations(),
    listAlertEvents(12),
    getRecentMetricPoints(21),
  ]);

  const trendRows = buildTrendRows(points);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-[#30363d] bg-[#161b22]/75 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8b949e]">Founder dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#f0f6fc]">Startup KPI Monitor</h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Access granted for <span className="font-medium text-[#c9d1d9]">{access.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard?refresh=true"
            className="rounded-xl border border-[#58a6ff] px-4 py-2 text-sm font-semibold text-[#79c0ff] hover:bg-[#1f2937]"
          >
            Run sync now
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-[#1f6feb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#388bfd]"
          >
            Pricing page
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaries.map((summary) => (
          <MetricCard
            key={summary.metricKey}
            metricKey={summary.metricKey}
            title={summary.label}
            value={summary.latestValue}
            changePercent={summary.changePercent}
          />
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#f0f6fc]">KPI Trends (last 21 days)</h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Daily averages across all active integrations.
            </p>
          </div>
        </div>

        <MetricTrendChart data={trendRows} metricKeys={[...METRIC_KEYS]} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <IntegrationSetup initialIntegrations={integrations} />
        <AlertSettings initialSettings={settings} />
      </section>

      <section className="mt-8 rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-5">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-[#8b949e]">
            No alert events yet. Once enough data accumulates, anomaly detection will start flagging
            meaningful drops.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-[#8b949e]">
                  <th className="border-b border-[#30363d] px-2 py-2">Metric</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Current</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Expected</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Drop</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Confidence</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Channels</th>
                  <th className="border-b border-[#30363d] px-2 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="text-[#c9d1d9]">
                    <td className="border-b border-[#21262d] px-2 py-2">{METRIC_LABELS[alert.metricKey]}</td>
                    <td className="border-b border-[#21262d] px-2 py-2">
                      {formatMetric(alert.metricKey, alert.currentValue)}
                    </td>
                    <td className="border-b border-[#21262d] px-2 py-2">
                      {formatMetric(alert.metricKey, alert.expectedValue)}
                    </td>
                    <td className="border-b border-[#21262d] px-2 py-2 text-[#ff7b72]">
                      {alert.dropPercent.toFixed(1)}%
                    </td>
                    <td className="border-b border-[#21262d] px-2 py-2">
                      {(alert.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="border-b border-[#21262d] px-2 py-2">
                      {alert.sentChannels.length > 0 ? alert.sentChannels.join(", ") : "stored only"}
                    </td>
                    <td className="border-b border-[#21262d] px-2 py-2 text-xs text-[#8b949e]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
