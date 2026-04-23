"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IntegrationRecord } from "@/lib/types";

interface IntegrationSetupProps {
  googleAnalyticsIntegration?: IntegrationRecord;
  mixpanelIntegration?: IntegrationRecord;
  onUpdated: () => Promise<void>;
}

export function IntegrationSetup({
  googleAnalyticsIntegration,
  mixpanelIntegration,
  onUpdated,
}: IntegrationSetupProps) {
  const [gaPropertyId, setGaPropertyId] = useState("");
  const [gaServiceEmail, setGaServiceEmail] = useState("");
  const [gaPrivateKey, setGaPrivateKey] = useState("");
  const [gaMetricNames, setGaMetricNames] = useState("sessions,activeUsers,newUsers");

  const [mixpanelApiSecret, setMixpanelApiSecret] = useState("");
  const [mixpanelEventName, setMixpanelEventName] = useState("Signup Completed");
  const [mixpanelProjectToken, setMixpanelProjectToken] = useState("");

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingGa, setIsSavingGa] = useState(false);
  const [isSavingMixpanel, setIsSavingMixpanel] = useState(false);

  async function connectGoogleAnalytics(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSavingGa(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/integrations/google-analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: gaPropertyId,
          serviceAccountEmail: gaServiceEmail,
          serviceAccountPrivateKey: gaPrivateKey,
          metricNames: gaMetricNames.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Google Analytics connection failed.");
      }

      setStatusMessage("Google Analytics connected and metrics fetched successfully.");
      await onUpdated();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Google Analytics connection failed.",
      );
    } finally {
      setIsSavingGa(false);
    }
  }

  async function connectMixpanel(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSavingMixpanel(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/integrations/mixpanel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiSecret: mixpanelApiSecret,
          eventName: mixpanelEventName,
          projectToken: mixpanelProjectToken,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mixpanel connection failed.");
      }

      setStatusMessage("Mixpanel connected and event volume fetched successfully.");
      await onUpdated();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Mixpanel connection failed.",
      );
    } finally {
      setIsSavingMixpanel(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect your analytics sources so Startup Metrics Alerter can monitor KPI health continuously.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form className="space-y-3" onSubmit={connectGoogleAnalytics}>
          <h4 className="text-sm font-semibold text-slate-200">Google Analytics 4</h4>
          <p className="text-xs text-slate-400">
            Status: {googleAnalyticsIntegration?.enabled ? "Connected" : "Not connected"}
            {googleAnalyticsIntegration?.lastError
              ? ` • Last error: ${googleAnalyticsIntegration.lastError}`
              : ""}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Property ID
              <Input
                value={gaPropertyId}
                onChange={(event) => setGaPropertyId(event.target.value)}
                placeholder="123456789"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Service account email
              <Input
                type="email"
                value={gaServiceEmail}
                onChange={(event) => setGaServiceEmail(event.target.value)}
                placeholder="analytics-reader@project.iam.gserviceaccount.com"
                required
              />
            </label>
          </div>

          <label className="space-y-1 text-sm text-slate-300">
            Service account private key
            <Textarea
              value={gaPrivateKey}
              onChange={(event) => setGaPrivateKey(event.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
              required
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Metrics to track (comma separated)
            <Input
              value={gaMetricNames}
              onChange={(event) => setGaMetricNames(event.target.value)}
              placeholder="sessions,activeUsers,newUsers"
              required
            />
          </label>

          <Button type="submit" disabled={isSavingGa}>
            {isSavingGa ? "Connecting..." : "Connect Google Analytics"}
          </Button>
        </form>

        <form className="space-y-3" onSubmit={connectMixpanel}>
          <h4 className="text-sm font-semibold text-slate-200">Mixpanel</h4>
          <p className="text-xs text-slate-400">
            Status: {mixpanelIntegration?.enabled ? "Connected" : "Not connected"}
            {mixpanelIntegration?.lastError
              ? ` • Last error: ${mixpanelIntegration.lastError}`
              : ""}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              API secret
              <Input
                type="password"
                value={mixpanelApiSecret}
                onChange={(event) => setMixpanelApiSecret(event.target.value)}
                placeholder="mixpanel_api_secret"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Event name to monitor
              <Input
                value={mixpanelEventName}
                onChange={(event) => setMixpanelEventName(event.target.value)}
                placeholder="Signup Completed"
                required
              />
            </label>
          </div>

          <label className="space-y-1 text-sm text-slate-300">
            Project token (optional)
            <Input
              value={mixpanelProjectToken}
              onChange={(event) => setMixpanelProjectToken(event.target.value)}
              placeholder="mixpanel_project_token"
            />
          </label>

          <Button type="submit" disabled={isSavingMixpanel}>
            {isSavingMixpanel ? "Connecting..." : "Connect Mixpanel"}
          </Button>
        </form>

        {statusMessage ? <p className="text-sm text-slate-300">{statusMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
