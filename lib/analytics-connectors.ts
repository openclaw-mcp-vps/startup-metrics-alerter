import { randomUUID } from "node:crypto";

import { formatISO, subDays } from "date-fns";
import { google } from "googleapis";
import Mixpanel from "mixpanel";

import type { IntegrationRecord, MetricSnapshot } from "@/lib/types";

interface GoogleAnalyticsConfig {
  propertyId: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  metricNames: string[];
}

interface MixpanelConfig {
  apiSecret: string;
  eventName: string;
  projectToken?: string;
}

function isoDate(daysAgo = 0): string {
  return formatISO(subDays(new Date(), daysAgo), { representation: "date" });
}

function normalizeMetricKey(metricName: string): string {
  return metricName.trim().toLowerCase();
}

export async function fetchGoogleAnalyticsMetrics(
  config: GoogleAnalyticsConfig,
): Promise<MetricSnapshot[]> {
  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.serviceAccountPrivateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  const analyticsData = google.analyticsdata({
    version: "v1beta",
    auth,
  });

  const selectedMetrics =
    config.metricNames.length > 0
      ? config.metricNames
      : ["sessions", "activeUsers", "newUsers"];

  const report = await analyticsData.properties.runReport({
    property: `properties/${config.propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
      metrics: selectedMetrics.map((name) => ({ name })),
      limit: "1",
    },
  });

  const row = report.data.rows?.[0];

  if (!row?.metricValues?.length) {
    throw new Error("Google Analytics returned no metric rows.");
  }

  const nowIso = new Date().toISOString();

  return selectedMetrics.map((metricName, index) => {
    const value = Number(row.metricValues?.[index]?.value ?? "0");

    return {
      id: randomUUID(),
      provider: "google-analytics",
      metricKey: normalizeMetricKey(metricName),
      value,
      capturedAt: nowIso,
    } satisfies MetricSnapshot;
  });
}

export async function fetchMixpanelMetrics(
  config: MixpanelConfig,
): Promise<MetricSnapshot[]> {
  if (config.projectToken) {
    Mixpanel.init(config.projectToken);
  }

  const url = new URL("https://mixpanel.com/api/query/segmentation");
  url.searchParams.set("from_date", isoDate(2));
  url.searchParams.set("to_date", isoDate(0));
  url.searchParams.set("event", JSON.stringify([config.eventName]));
  url.searchParams.set("unit", "day");
  url.searchParams.set("type", "general");

  const authHeader = Buffer.from(`${config.apiSecret}:`).toString("base64");

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mixpanel API ${response.status}: ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    data?: {
      values?: Record<string, Record<string, number>>;
    };
  };

  const series = payload.data?.values?.[config.eventName];

  if (!series) {
    throw new Error("Mixpanel returned no values for the configured event.");
  }

  const latestDate = Object.keys(series).sort().at(-1);

  if (!latestDate) {
    throw new Error("Mixpanel series has no date keys.");
  }

  const latestValue = Number(series[latestDate]);

  return [
    {
      id: randomUUID(),
      provider: "mixpanel",
      metricKey: `events:${normalizeMetricKey(config.eventName)}`,
      value: latestValue,
      capturedAt: new Date().toISOString(),
    },
  ];
}

function readStringConfig(
  config: IntegrationRecord["config"],
  key: string,
): string {
  const value = config[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing integration config value: ${key}`);
  }
  return value;
}

function readStringArrayConfig(
  config: IntegrationRecord["config"],
  key: string,
): string[] {
  const value = config[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function fetchMetricsForIntegration(
  integration: IntegrationRecord,
): Promise<MetricSnapshot[]> {
  if (integration.provider === "google-analytics") {
    return fetchGoogleAnalyticsMetrics({
      propertyId: readStringConfig(integration.config, "propertyId"),
      serviceAccountEmail: readStringConfig(
        integration.config,
        "serviceAccountEmail",
      ),
      serviceAccountPrivateKey: readStringConfig(
        integration.config,
        "serviceAccountPrivateKey",
      ),
      metricNames: readStringArrayConfig(integration.config, "metricNames"),
    });
  }

  if (integration.provider === "mixpanel") {
    return fetchMixpanelMetrics({
      apiSecret: readStringConfig(integration.config, "apiSecret"),
      eventName: readStringConfig(integration.config, "eventName"),
      projectToken:
        typeof integration.config.projectToken === "string"
          ? integration.config.projectToken
          : undefined,
    });
  }

  throw new Error(`Unsupported provider: ${integration.provider}`);
}
