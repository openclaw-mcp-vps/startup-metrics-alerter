export type IntegrationProvider = "google-analytics" | "mixpanel";
export type NotificationChannel = "email" | "slack";

export interface MetricSnapshot {
  id: string;
  provider: IntegrationProvider;
  metricKey: string;
  value: number;
  capturedAt: string;
}

export interface IntegrationRecord {
  provider: IntegrationProvider;
  enabled: boolean;
  connectedAt: string | null;
  updatedAt: string;
  lastError: string | null;
  config: Record<string, string | string[] | boolean>;
}

export interface AlertRule {
  id: string;
  provider: IntegrationProvider;
  metricKey: string;
  minDropPercent: number;
  lookbackPoints: number;
  channel: NotificationChannel;
  target: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  provider: IntegrationProvider;
  metricKey: string;
  baseline: number;
  currentValue: number;
  dropPercent: number;
  zScore: number;
  severity: "medium" | "high";
  message: string;
  channel: NotificationChannel;
  target: string;
  createdAt: string;
  delivered: boolean;
  deliveryError: string | null;
}

export interface PaymentRecord {
  sessionId: string;
  email: string | null;
  createdAt: string;
}

export interface AppState {
  integrations: IntegrationRecord[];
  metrics: MetricSnapshot[];
  alertRules: AlertRule[];
  alerts: AlertEvent[];
  paidSessions: PaymentRecord[];
}
