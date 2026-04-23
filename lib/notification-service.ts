import { Resend } from "resend";

import type { AlertSettings, MetricKey } from "@/lib/types";

interface AlertNotificationPayload {
  metricKey: MetricKey;
  metricLabel: string;
  currentValue: number;
  expectedValue: number;
  dropPercent: number;
  confidence: number;
  summary: string;
}

interface NotificationResult {
  sentChannels: string[];
  detail: string[];
}

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatNumber(metricKey: MetricKey, value: number) {
  if (metricKey === "activation_rate" || metricKey === "trial_to_paid" || metricKey === "churn_rate") {
    return `${value.toFixed(2)}%`;
  }

  if (metricKey === "mrr") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

async function sendEmail(settings: AlertSettings, payload: AlertNotificationPayload) {
  if (!resendClient || !settings.emailTo) {
    return false;
  }

  const recipients = settings.emailTo
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return false;
  }

  const fromAddress = process.env.ALERTS_FROM_EMAIL ?? "alerts@startup-metrics-alerter.com";

  await resendClient.emails.send({
    from: fromAddress,
    to: recipients,
    subject: `Metric drop detected: ${payload.metricLabel}`,
    text: `${payload.summary}\n\nCurrent: ${formatNumber(payload.metricKey, payload.currentValue)}\nExpected: ${formatNumber(payload.metricKey, payload.expectedValue)}\nDrop: ${payload.dropPercent.toFixed(1)}%\nConfidence: ${(payload.confidence * 100).toFixed(1)}%`,
  });

  return true;
}

async function sendSlack(settings: AlertSettings, payload: AlertNotificationPayload) {
  if (!settings.slackWebhookUrl) {
    return false;
  }

  const response = await fetch(settings.slackWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `*${payload.metricLabel}* dropped by *${payload.dropPercent.toFixed(1)}%*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Metric drop detected: ${payload.metricLabel}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Current*\n${formatNumber(payload.metricKey, payload.currentValue)}`,
            },
            {
              type: "mrkdwn",
              text: `*Expected*\n${formatNumber(payload.metricKey, payload.expectedValue)}`,
            },
            {
              type: "mrkdwn",
              text: `*Drop*\n${payload.dropPercent.toFixed(1)}%`,
            },
            {
              type: "mrkdwn",
              text: `*Confidence*\n${(payload.confidence * 100).toFixed(1)}%`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: payload.summary,
            },
          ],
        },
      ],
    }),
  });

  return response.ok;
}

export async function sendAlertNotifications(
  settings: AlertSettings,
  payload: AlertNotificationPayload,
): Promise<NotificationResult> {
  const sentChannels: string[] = [];
  const detail: string[] = [];

  try {
    const emailSent = await sendEmail(settings, payload);
    if (emailSent) {
      sentChannels.push("email");
      detail.push("Email alert delivered.");
    } else if (settings.emailTo) {
      detail.push("Email alert skipped (Resend not configured or no recipients).");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    detail.push(`Email alert failed: ${message}`);
  }

  try {
    const slackSent = await sendSlack(settings, payload);
    if (slackSent) {
      sentChannels.push("slack");
      detail.push("Slack alert delivered.");
    } else if (settings.slackWebhookUrl) {
      detail.push("Slack alert failed with non-2xx response.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    detail.push(`Slack alert failed: ${message}`);
  }

  return {
    sentChannels,
    detail,
  };
}
