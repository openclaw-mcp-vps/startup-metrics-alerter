import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  type AlertEvent,
  type AlertSettings,
  type DashboardMetricSummary,
  type Integration,
  METRIC_KEYS,
  METRIC_LABELS,
  type MetricKey,
  type MetricPoint,
  type PurchaseRecord,
} from "@/lib/types";

interface AppState {
  version: number;
  integrations: Integration[];
  alertSettings: AlertSettings;
  metricPoints: MetricPoint[];
  alerts: AlertEvent[];
  purchases: PurchaseRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const ENCRYPTED_PREFIX = "enc::";

const defaultAlertSettings: AlertSettings = {
  dropThresholdPercent: 18,
  minConfidence: 0.72,
  lookbackDays: 30,
  monitoredMetrics: [...METRIC_KEYS],
  emailTo: "",
  slackWebhookUrl: "",
  timezone: "UTC",
  quietHoursStart: "",
  quietHoursEnd: "",
  updatedAt: new Date().toISOString(),
};

const defaultState: AppState = {
  version: 1,
  integrations: [],
  alertSettings: defaultAlertSettings,
  metricPoints: [],
  alerts: [],
  purchases: [],
};

function getEncryptionKey() {
  const secret =
    process.env.APP_ENCRYPTION_KEY ??
    process.env.ACCESS_COOKIE_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "local-dev-key-change-in-production";

  return createHash("sha256").update(secret).digest();
}

function encryptValue(raw: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptValue(raw: string) {
  if (!raw.startsWith(ENCRYPTED_PREFIX)) {
    return raw;
  }

  const payload = raw.slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(".");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    return "";
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

function shouldEncryptField(key: string) {
  return /(secret|token|key|password|json)/i.test(key);
}

function encodeConfig(config: Record<string, string>) {
  const encoded: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    if (value && shouldEncryptField(key)) {
      encoded[key] = encryptValue(value);
      continue;
    }

    encoded[key] = value;
  }

  return encoded;
}

function decodeConfig(config: Record<string, string>) {
  const decoded: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    decoded[key] = decryptValue(value);
  }

  return decoded;
}

function redactConfig(config: Record<string, string>) {
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    if (shouldEncryptField(key) && value) {
      redacted[key] = "••••••••";
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

async function readState() {
  await ensureStore();

  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as AppState;

  return {
    ...defaultState,
    ...parsed,
    alertSettings: {
      ...defaultAlertSettings,
      ...parsed.alertSettings,
    },
  };
}

async function writeState(state: AppState) {
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function mutateState<T>(mutator: (state: AppState) => Promise<T> | T) {
  const state = await readState();
  const result = await mutator(state);
  await writeState(state);
  return result;
}

export async function listIntegrations() {
  const state = await readState();

  return state.integrations.map((integration) => ({
    ...integration,
    config: redactConfig(decodeConfig(integration.config)),
  }));
}

export async function getActiveIntegrations() {
  const state = await readState();

  return state.integrations
    .filter((integration) => integration.enabled)
    .map((integration) => ({
      ...integration,
      config: decodeConfig(integration.config),
    }));
}

export async function saveIntegration(input: {
  id?: string;
  provider: Integration["provider"];
  name: string;
  config: Record<string, string>;
  enabled?: boolean;
}) {
  return mutateState(async (state) => {
    const now = new Date().toISOString();
    const integration: Integration = {
      id: input.id ?? randomUUID(),
      provider: input.provider,
      name: input.name,
      config: encodeConfig(input.config),
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const existingIndex = state.integrations.findIndex((item) => item.id === integration.id);

    if (existingIndex >= 0) {
      const existing = state.integrations[existingIndex];
      state.integrations[existingIndex] = {
        ...existing,
        ...integration,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } else {
      state.integrations.push(integration);
    }

    return {
      ...integration,
      config: redactConfig(input.config),
    };
  });
}

export async function setIntegrationEnabled(id: string, enabled: boolean) {
  return mutateState(async (state) => {
    const integration = state.integrations.find((item) => item.id === id);

    if (!integration) {
      return null;
    }

    integration.enabled = enabled;
    integration.updatedAt = new Date().toISOString();

    return {
      ...integration,
      config: redactConfig(decodeConfig(integration.config)),
    };
  });
}

export async function removeIntegration(id: string) {
  return mutateState(async (state) => {
    const previousLength = state.integrations.length;
    state.integrations = state.integrations.filter((item) => item.id !== id);
    return state.integrations.length < previousLength;
  });
}

export async function getAlertSettings() {
  const state = await readState();
  return state.alertSettings;
}

export async function updateAlertSettings(next: Partial<AlertSettings>) {
  return mutateState(async (state) => {
    state.alertSettings = {
      ...state.alertSettings,
      ...next,
      updatedAt: new Date().toISOString(),
    };

    return state.alertSettings;
  });
}

export async function storeMetricPoints(
  points: Array<Omit<MetricPoint, "id">>,
  maxPoints = 10000,
) {
  if (points.length === 0) {
    return 0;
  }

  return mutateState(async (state) => {
    const normalized: MetricPoint[] = points.map((point) => ({
      ...point,
      id: randomUUID(),
    }));

    state.metricPoints.push(...normalized);
    state.metricPoints = state.metricPoints
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
      .slice(-maxPoints);

    return normalized.length;
  });
}

export async function getMetricHistory(metricKey: MetricKey, days = 30) {
  const state = await readState();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return state.metricPoints
    .filter(
      (point) =>
        point.metricKey === metricKey && new Date(point.capturedAt).getTime() >= cutoff,
    )
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

export async function getRecentMetricPoints(days = 30) {
  const state = await readState();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return state.metricPoints
    .filter((point) => new Date(point.capturedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

export async function getDashboardMetricSummaries(days = 14): Promise<DashboardMetricSummary[]> {
  const points = await getRecentMetricPoints(Math.max(days, 2));

  return METRIC_KEYS.map((metricKey) => {
    const metricPoints = points
      .filter((point) => point.metricKey === metricKey)
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

    const latest = metricPoints.at(-1)?.value ?? null;
    const previous = metricPoints.length > 1 ? metricPoints.at(-2)?.value ?? null : null;

    const changePercent =
      latest !== null && previous !== null && previous !== 0
        ? ((latest - previous) / previous) * 100
        : null;

    return {
      metricKey,
      label: METRIC_LABELS[metricKey],
      latestValue: latest,
      previousValue: previous,
      changePercent,
      sparkline: metricPoints.slice(-days).map((point) => ({
        date: point.capturedAt,
        value: point.value,
      })),
    };
  });
}

export async function createAlertEvent(
  input: Omit<AlertEvent, "id" | "createdAt">,
) {
  return mutateState(async (state) => {
    const alert: AlertEvent = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    state.alerts.unshift(alert);
    state.alerts = state.alerts.slice(0, 2000);

    return alert;
  });
}

export async function listAlertEvents(limit = 30) {
  const state = await readState();
  return state.alerts.slice(0, limit);
}

export async function hasRecentAlert(metricKey: MetricKey, lookbackHours = 12) {
  const state = await readState();
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;

  return state.alerts.some(
    (alert) =>
      alert.metricKey === metricKey && new Date(alert.createdAt).getTime() >= cutoff,
  );
}

export async function recordPurchase(input: {
  sessionId: string;
  email: string;
  amountTotal: number;
  currency: string;
}) {
  return mutateState(async (state) => {
    const existing = state.purchases.find((purchase) => purchase.sessionId === input.sessionId);

    if (existing) {
      return existing;
    }

    const purchase: PurchaseRecord = {
      id: randomUUID(),
      sessionId: input.sessionId,
      email: input.email.toLowerCase(),
      amountTotal: input.amountTotal,
      currency: input.currency.toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    state.purchases.unshift(purchase);
    state.purchases = state.purchases.slice(0, 5000);

    return purchase;
  });
}

export async function findPurchaseBySessionId(sessionId: string) {
  const state = await readState();
  return state.purchases.find((purchase) => purchase.sessionId === sessionId) ?? null;
}

export async function findLatestPurchaseByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const state = await readState();

  return (
    state.purchases.find((purchase) => purchase.email.toLowerCase() === normalizedEmail) ?? null
  );
}
