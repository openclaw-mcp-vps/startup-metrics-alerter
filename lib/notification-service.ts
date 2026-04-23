import { Resend } from "resend";

import type { AlertEvent } from "@/lib/types";

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendEmailAlert(alert: AlertEvent): Promise<void> {
  if (!resendClient) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.ALERT_FROM_EMAIL ?? "alerts@startupmetricsalerter.com";

  await resendClient.emails.send({
    from,
    to: [alert.target],
    subject: `KPI Alert: ${alert.metricKey} dropped ${alert.dropPercent.toFixed(1)}%`,
    html: `
      <h2>Startup Metrics Alert</h2>
      <p><strong>${alert.message}</strong></p>
      <ul>
        <li>Provider: ${alert.provider}</li>
        <li>Metric: ${alert.metricKey}</li>
        <li>Current value: ${alert.currentValue}</li>
        <li>Baseline: ${alert.baseline.toFixed(2)}</li>
        <li>Drop: ${alert.dropPercent.toFixed(2)}%</li>
        <li>Z-score: ${alert.zScore.toFixed(2)}</li>
      </ul>
      <p>Review your dashboard to inspect funnel and acquisition performance immediately.</p>
    `,
  });
}

async function sendSlackAlert(alert: AlertEvent): Promise<void> {
  const webhookUrl = alert.target || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Slack webhook URL is not configured.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `:warning: ${alert.message}\nProvider: ${alert.provider}\nMetric: ${alert.metricKey}\nCurrent: ${alert.currentValue.toFixed(
        2,
      )} | Baseline: ${alert.baseline.toFixed(2)} | Drop: ${alert.dropPercent.toFixed(2)}%`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack returned ${response.status}`);
  }
}

export async function deliverAlerts(alerts: AlertEvent[]): Promise<AlertEvent[]> {
  const deliveredAlerts: AlertEvent[] = [];

  for (const alert of alerts) {
    const next = { ...alert };

    try {
      if (alert.channel === "email") {
        await sendEmailAlert(alert);
      } else {
        await sendSlackAlert(alert);
      }

      next.delivered = true;
      next.deliveryError = null;
    } catch (error) {
      next.delivered = false;
      next.deliveryError =
        error instanceof Error ? error.message : "Unknown delivery error";
    }

    deliveredAlerts.push(next);
  }

  return deliveredAlerts;
}
