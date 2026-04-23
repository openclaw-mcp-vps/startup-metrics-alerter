import { google } from "googleapis";

import { type Integration, type MetricKey, METRIC_KEYS, type MetricPoint } from "@/lib/types";

interface CollectMetricsResult {
  points: Array<Omit<MetricPoint, "id">>;
  detail: string[];
}

function toIsoDateAtUTC(dateText: string) {
  if (/^\d{8}$/.test(dateText)) {
    const year = dateText.slice(0, 4);
    const month = dateText.slice(4, 6);
    const day = dateText.slice(6, 8);
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return `${dateText}T00:00:00.000Z`;
  }

  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function getIsoDateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeNumber(value: unknown) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchGoogleAnalyticsSeries(
  integration: Integration,
  metricName: string,
  metricKey: MetricKey,
  lookbackDays: number,
): Promise<Array<Omit<MetricPoint, "id">>> {
  const propertyId = integration.config.propertyId;
  const serviceAccountJson = integration.config.serviceAccountJson;

  if (!propertyId || !serviceAccountJson) {
    return [];
  }

  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dimensions: [{ name: "date" }],
      metrics: [{ name: metricName }],
      dateRanges: [
        {
          startDate: `${Math.max(lookbackDays, 1)}daysAgo`,
          endDate: "today",
        },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });

  return (
    response.data.rows?.map((row) => ({
      provider: integration.provider,
      metricKey,
      value: normalizeNumber(row.metricValues?.[0]?.value),
      capturedAt: toIsoDateAtUTC(row.dimensionValues?.[0]?.value ?? new Date().toISOString()),
    })) ?? []
  );
}

async function fetchMixpanelEventSeries(
  integration: Integration,
  metricKey: MetricKey,
  eventName: string,
  lookbackDays: number,
): Promise<Array<Omit<MetricPoint, "id">>> {
  const username = integration.config.serviceAccountUsername;
  const secret = integration.config.serviceAccountSecret;

  if (!username || !secret || !eventName) {
    return [];
  }

  const fromDate = getIsoDateOffset(lookbackDays);
  const toDate = getIsoDateOffset(0);

  const url = new URL("https://mixpanel.com/api/query/segmentation");
  url.searchParams.set("event", JSON.stringify([eventName]));
  url.searchParams.set("from_date", fromDate);
  url.searchParams.set("to_date", toDate);
  url.searchParams.set("unit", "day");
  url.searchParams.set("type", "general");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mixpanel API request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: {
      series?: Record<string, number[]>;
      values?: Record<string, Record<string, number>>;
      xValues?: string[];
    };
  };

  const valuesMap = payload.data?.values?.[eventName];

  if (valuesMap) {
    return Object.entries(valuesMap).map(([date, value]) => ({
      provider: integration.provider,
      metricKey,
      value: normalizeNumber(value),
      capturedAt: toIsoDateAtUTC(date),
    }));
  }

  const series = payload.data?.series?.[eventName];
  const xValues = payload.data?.xValues;

  if (!series || !xValues || series.length !== xValues.length) {
    return [];
  }

  return xValues.map((date, index) => ({
    provider: integration.provider,
    metricKey,
    value: normalizeNumber(series[index]),
    capturedAt: toIsoDateAtUTC(date),
  }));
}

export async function collectMetricsFromIntegrations(
  integrations: Integration[],
  lookbackDays: number,
): Promise<CollectMetricsResult> {
  const points: Array<Omit<MetricPoint, "id">> = [];
  const detail: string[] = [];

  for (const integration of integrations) {
    if (!integration.enabled) {
      continue;
    }

    if (integration.provider === "google-analytics") {
      const gaMetricMap: Partial<Record<MetricKey, string>> = {
        signups: integration.config.signupsMetric || "newUsers",
        activation_rate: integration.config.activationRateMetric || "engagementRate",
        trial_to_paid: integration.config.trialToPaidMetric || "purchaseToViewRate",
        mrr: integration.config.mrrMetric || "purchaseRevenue",
        churn_rate: integration.config.churnRateMetric || "",
      };

      for (const metricKey of METRIC_KEYS) {
        const metricName = gaMetricMap[metricKey];

        if (!metricName) {
          continue;
        }

        try {
          const metricPoints = await fetchGoogleAnalyticsSeries(
            integration,
            metricName,
            metricKey,
            lookbackDays,
          );
          points.push(...metricPoints);

          if (metricPoints.length > 0) {
            detail.push(
              `Fetched ${metricPoints.length} ${metricKey} points from ${integration.name}.`,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          detail.push(`Google Analytics (${integration.name}) ${metricKey} failed: ${message}`);
        }
      }

      continue;
    }

    if (integration.provider === "mixpanel") {
      const mixpanelMetricMap: Partial<Record<MetricKey, string>> = {
        signups: integration.config.signupsEvent,
        activation_rate: integration.config.activationEvent,
        trial_to_paid: integration.config.trialToPaidEvent,
        mrr: integration.config.mrrEvent,
        churn_rate: integration.config.churnEvent,
      };

      for (const metricKey of METRIC_KEYS) {
        const eventName = mixpanelMetricMap[metricKey];

        if (!eventName) {
          continue;
        }

        try {
          const metricPoints = await fetchMixpanelEventSeries(
            integration,
            metricKey,
            eventName,
            lookbackDays,
          );
          points.push(...metricPoints);

          if (metricPoints.length > 0) {
            detail.push(`Fetched ${metricPoints.length} ${metricKey} points from ${integration.name}.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          detail.push(`Mixpanel (${integration.name}) ${metricKey} failed: ${message}`);
        }
      }
    }
  }

  return {
    points,
    detail,
  };
}
