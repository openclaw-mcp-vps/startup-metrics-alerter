"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AlertRule, IntegrationProvider, NotificationChannel } from "@/lib/types";

interface AlertSettingsProps {
  rules: AlertRule[];
  metricOptions: Array<{ provider: IntegrationProvider; metricKey: string }>;
  onRuleSaved: () => Promise<void>;
}

export function AlertSettings({ rules, metricOptions, onRuleSaved }: AlertSettingsProps) {
  const [provider, setProvider] = useState<IntegrationProvider>("google-analytics");
  const [metricKey, setMetricKey] = useState<string>(metricOptions[0]?.metricKey ?? "sessions");
  const [minDropPercent, setMinDropPercent] = useState<number>(20);
  const [lookbackPoints, setLookbackPoints] = useState<number>(7);
  const [channel, setChannel] = useState<NotificationChannel>("email");
  const [target, setTarget] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableForProvider = useMemo(
    () => metricOptions.filter((item) => item.provider === provider),
    [metricOptions, provider],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          metricKey,
          minDropPercent,
          lookbackPoints,
          channel,
          target,
          enabled: true,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save alert rule.");
      }

      setMessage("Alert rule saved. New anomalies will trigger notifications.");
      await onRuleSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save alert rule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Rules</CardTitle>
        <CardDescription>
          Choose the metric threshold, lookback window, and delivery channel for anomaly alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm text-slate-300">
            Provider
            <select
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as IntegrationProvider;
                setProvider(nextProvider);
                const nextMetric = metricOptions.find(
                  (item) => item.provider === nextProvider,
                );
                if (nextMetric) {
                  setMetricKey(nextMetric.metricKey);
                }
              }}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="google-analytics">Google Analytics</option>
              <option value="mixpanel">Mixpanel</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Metric
            <select
              value={metricKey}
              onChange={(event) => setMetricKey(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              {availableForProvider.length > 0 ? (
                availableForProvider.map((item) => (
                  <option key={`${item.provider}:${item.metricKey}`} value={item.metricKey}>
                    {item.metricKey}
                  </option>
                ))
              ) : (
                <option value={metricKey}>{metricKey}</option>
              )}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Minimum drop (%)
            <Input
              type="number"
              min={5}
              max={90}
              value={minDropPercent}
              onChange={(event) => setMinDropPercent(Number(event.target.value))}
              required
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Lookback points
            <Input
              type="number"
              min={3}
              max={60}
              value={lookbackPoints}
              onChange={(event) => setLookbackPoints(Number(event.target.value))}
              required
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Channel
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value as NotificationChannel)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="email">Email</option>
              <option value="slack">Slack webhook</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            {channel === "email" ? "Recipient email" : "Slack webhook URL"}
            <Input
              type={channel === "email" ? "email" : "url"}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder={
                channel === "email"
                  ? "alerts@yourstartup.com"
                  : "https://hooks.slack.com/services/..."
              }
              required
            />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save alert rule"}
            </Button>
          </div>
        </form>

        {message ? <p className="text-sm text-slate-300">{message}</p> : null}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-200">Active rules</h4>
          {rules.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-300">
              {rules.map((rule) => (
                <li key={rule.id} className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                  {rule.provider} / {rule.metricKey} / drop {rule.minDropPercent}% / {rule.channel} → {rule.target}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No alert rules yet. Add one to start receiving KPI warnings.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
