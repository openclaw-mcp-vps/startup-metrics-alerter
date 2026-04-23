export const METRIC_KEYS = [
  "mrr",
  "signups",
  "activation_rate",
  "trial_to_paid",
  "churn_rate",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_LABELS: Record<MetricKey, string> = {
  mrr: "Monthly Recurring Revenue",
  signups: "Signups",
  activation_rate: "Activation Rate",
  trial_to_paid: "Trial to Paid Conversion",
  churn_rate: "Churn Rate",
};

export type IntegrationProvider = "google-analytics" | "mixpanel";

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertSettings {
  dropThresholdPercent: number;
  minConfidence: number;
  lookbackDays: number;
  monitoredMetrics: MetricKey[];
  emailTo: string;
  slackWebhookUrl?: string;
  timezone: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: string;
}

export interface MetricPoint {
  id: string;
  provider: IntegrationProvider;
  metricKey: MetricKey;
  value: number;
  capturedAt: string;
}

export interface AlertEvent {
  id: string;
  metricKey: MetricKey;
  provider: IntegrationProvider | "aggregated";
  expectedValue: number;
  currentValue: number;
  dropPercent: number;
  confidence: number;
  summary: string;
  sentChannels: string[];
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  sessionId: string;
  email: string;
  amountTotal: number;
  currency: string;
  createdAt: string;
}

export interface DashboardMetricSummary {
  metricKey: MetricKey;
  label: string;
  latestValue: number | null;
  previousValue: number | null;
  changePercent: number | null;
  sparkline: Array<{ date: string; value: number }>;
}

export interface MonitorRunResult {
  fetchedPoints: number;
  anomaliesDetected: number;
  notificationsSent: number;
  detail: string[];
}
