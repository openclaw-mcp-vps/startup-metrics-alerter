"use client";

import { useMemo, useState } from "react";

import { METRIC_KEYS, METRIC_LABELS, type AlertSettings as AlertSettingsType, type MetricKey } from "@/lib/types";

interface AlertSettingsProps {
  initialSettings: AlertSettingsType;
}

export function AlertSettings({ initialSettings }: AlertSettingsProps) {
  const [settings, setSettings] = useState<AlertSettingsType>(initialSettings);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const metricOptions = useMemo(
    () =>
      METRIC_KEYS.map((metricKey) => ({
        metricKey,
        label: METRIC_LABELS[metricKey],
      })),
    [],
  );

  const toggleMetric = (metricKey: MetricKey) => {
    setSettings((current) => {
      const exists = current.monitoredMetrics.includes(metricKey);

      return {
        ...current,
        monitoredMetrics: exists
          ? current.monitoredMetrics.filter((item) => item !== metricKey)
          : [...current.monitoredMetrics, metricKey],
      };
    });
  };

  const update = (field: keyof AlertSettingsType, value: string | number) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    setStatus("Saving settings...");

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update",
        settings,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      settings?: AlertSettingsType;
    };

    setLoading(false);

    if (!response.ok || !payload.settings) {
      setStatus(payload.error ?? "Failed to save settings.");
      return;
    }

    setSettings(payload.settings);
    setStatus("Settings updated.");
  };

  const runNow = async () => {
    setLoading(true);
    setStatus("Running monitor cycle...");

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "run-now",
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      result?: { fetchedPoints: number; anomaliesDetected: number; notificationsSent: number };
    };

    setLoading(false);

    if (!response.ok || !payload.result) {
      setStatus(payload.error ?? "Monitor run failed.");
      return;
    }

    setStatus(
      `Run complete: ${payload.result.fetchedPoints} points fetched, ${payload.result.anomaliesDetected} anomalies, ${payload.result.notificationsSent} notifications sent.`,
    );
  };

  return (
    <section className="rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">Alert Rules</h2>
        <p className="mt-1 text-sm text-[#8b949e]">
          Tune sensitivity so you catch meaningful drops without being spammed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Drop threshold (%)</span>
          <input
            type="number"
            value={settings.dropThresholdPercent}
            min={5}
            max={80}
            onChange={(event) => update("dropThresholdPercent", Number(event.target.value))}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Minimum confidence (0-1)</span>
          <input
            type="number"
            value={settings.minConfidence}
            min={0.3}
            max={0.99}
            step={0.01}
            onChange={(event) => update("minConfidence", Number(event.target.value))}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Lookback window (days)</span>
          <input
            type="number"
            value={settings.lookbackDays}
            min={7}
            max={90}
            onChange={(event) => update("lookbackDays", Number(event.target.value))}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Alert email recipients</span>
          <input
            type="email"
            value={settings.emailTo}
            placeholder="founder@startup.com"
            onChange={(event) => update("emailTo", event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Slack incoming webhook URL</span>
          <input
            type="url"
            value={settings.slackWebhookUrl ?? ""}
            placeholder="https://hooks.slack.com/services/..."
            onChange={(event) => update("slackWebhookUrl", event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Quiet hours start (HH:mm)</span>
          <input
            type="text"
            value={settings.quietHoursStart ?? ""}
            onChange={(event) => update("quietHoursStart", event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Quiet hours end (HH:mm)</span>
          <input
            type="text"
            value={settings.quietHoursEnd ?? ""}
            onChange={(event) => update("quietHoursEnd", event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Timezone</span>
          <input
            type="text"
            value={settings.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm text-[#c9d1d9]">Metrics to monitor</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {metricOptions.map((option) => (
            <label
              key={option.metricKey}
              className="flex items-center gap-2 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#c9d1d9]"
            >
              <input
                type="checkbox"
                checked={settings.monitoredMetrics.includes(option.metricKey)}
                onChange={() => toggleMetric(option.metricKey)}
                className="h-4 w-4"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={saveSettings}
          className="rounded-xl bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save alert settings
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={runNow}
          className="rounded-xl border border-[#58a6ff] px-4 py-2 text-sm font-semibold text-[#79c0ff] transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Run monitor now
        </button>
      </div>

      <p className="mt-3 text-xs text-[#8b949e]">{status}</p>
    </section>
  );
}
