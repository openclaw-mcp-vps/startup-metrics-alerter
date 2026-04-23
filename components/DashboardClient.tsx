"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

import { AlertSettings } from "@/components/AlertSettings";
import { IntegrationSetup } from "@/components/IntegrationSetup";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlertEvent, AlertRule, IntegrationRecord, MetricSnapshot } from "@/lib/types";

interface DashboardPayload {
  rules: AlertRule[];
  alerts: AlertEvent[];
  metrics: MetricSnapshot[];
  integrations: IntegrationRecord[];
}

export function DashboardClient() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>("sessions");
  const [checkStatus, setCheckStatus] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const json = (await response.json()) as DashboardPayload & { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load dashboard data.");
      }

      setPayload(json);

      const firstMetric = json.metrics.at(-1)?.metricKey;
      if (firstMetric) {
        setSelectedMetricKey((previous) => previous || firstMetric);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function runMetricCheck(): Promise<void> {
    setCheckStatus("Running live KPI check...");

    try {
      const response = await fetch("/api/cron/check-metrics", {
        method: "POST",
      });

      const json = (await response.json()) as { error?: string; fetched?: number; alerts?: number };

      if (!response.ok) {
        throw new Error(json.error ?? "Metric check failed.");
      }

      setCheckStatus(
        `Check complete: ${json.fetched ?? 0} metric values fetched, ${json.alerts ?? 0} alerts generated.`,
      );
      await loadDashboard();
    } catch (runError) {
      setCheckStatus(
        runError instanceof Error ? runError.message : "Metric check failed.",
      );
    }
  }

  const latestMetrics = useMemo(() => {
    if (!payload) {
      return [];
    }

    const map = new Map<string, MetricSnapshot>();

    payload.metrics.forEach((metric) => {
      map.set(`${metric.provider}:${metric.metricKey}`, metric);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.metricKey.localeCompare(b.metricKey),
    );
  }, [payload]);

  const metricOptions = useMemo(() => {
    if (!payload) {
      return [] as Array<{ provider: "google-analytics" | "mixpanel"; metricKey: string }>;
    }

    const unique = new Map<string, { provider: "google-analytics" | "mixpanel"; metricKey: string }>();
    payload.metrics.forEach((metric) => {
      unique.set(`${metric.provider}:${metric.metricKey}`, {
        provider: metric.provider,
        metricKey: metric.metricKey,
      });
    });

    return Array.from(unique.values());
  }, [payload]);

  const chartData = useMemo(() => {
    if (!payload) {
      return [] as Array<{ time: string; value: number }>;
    }

    return payload.metrics
      .filter((metric) => metric.metricKey === selectedMetricKey)
      .slice(-24)
      .map((metric) => ({
        time: format(new Date(metric.capturedAt), "MMM d HH:mm"),
        value: metric.value,
      }));
  }, [payload, selectedMetricKey]);

  const googleAnalyticsIntegration = payload?.integrations.find(
    (integration) => integration.provider === "google-analytics",
  );

  const mixpanelIntegration = payload?.integrations.find(
    (integration) => integration.provider === "mixpanel",
  );

  if (loading) {
    return <p className="text-sm text-slate-300">Loading KPI telemetry...</p>;
  }

  if (error || !payload) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-rose-300">{error ?? "Dashboard failed to load."}</p>
          <Button className="mt-3" onClick={() => void loadDashboard()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">KPI Monitoring Dashboard</h1>
          <p className="text-sm text-slate-400">
            Track real-time metrics, detect anomalies, and notify your team before growth stalls.
          </p>
        </div>
        <Button onClick={() => void runMetricCheck()}>Run check now</Button>
      </div>

      {checkStatus ? <p className="text-sm text-slate-300">{checkStatus}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {latestMetrics.length > 0 ? (
          latestMetrics.map((metric) => {
            const recentAlert = payload.alerts.find(
              (alert) =>
                alert.provider === metric.provider && alert.metricKey === metric.metricKey,
            );

            return (
              <MetricCard
                key={`${metric.provider}:${metric.metricKey}`}
                provider={metric.provider}
                metric={metric.metricKey}
                value={metric.value}
                dropPercent={recentAlert?.dropPercent}
              />
            );
          })
        ) : (
          <Card className="md:col-span-3">
            <CardContent className="p-5 text-sm text-slate-400">
              No metrics yet. Connect an integration and run a check to begin tracking.
            </CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Metric Trend</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span>Viewing</span>
            <select
              value={selectedMetricKey}
              onChange={(event) => setSelectedMetricKey(event.target.value)}
              className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3"
            >
              {metricOptions.map((option) => (
                <option key={`${option.provider}:${option.metricKey}`} value={option.metricKey}>
                  {option.provider}: {option.metricKey}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] p-3 md:p-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <IntegrationSetup
        googleAnalyticsIntegration={googleAnalyticsIntegration}
        mixpanelIntegration={mixpanelIntegration}
        onUpdated={loadDashboard}
      />

      <AlertSettings
        rules={payload.rules}
        metricOptions={metricOptions}
        onRuleSaved={loadDashboard}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {payload.alerts.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-300">
              {payload.alerts.slice().reverse().slice(0, 12).map((alert) => (
                <li key={alert.id} className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  <p className="font-medium text-slate-100">{alert.message}</p>
                  <p className="text-xs text-slate-400">
                    {alert.channel} to {alert.target} • {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  {alert.deliveryError ? (
                    <p className="text-xs text-rose-300">Delivery issue: {alert.deliveryError}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No alerts fired yet. The engine needs baseline history before anomalies trigger.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
