import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  AlertEvent,
  AlertRule,
  AppState,
  IntegrationProvider,
  IntegrationRecord,
  MetricSnapshot,
  PaymentRecord,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "app-state.json");

const MAX_METRICS = 5000;
const MAX_ALERTS = 1000;
const MAX_SESSIONS = 2000;

const DEFAULT_STATE: AppState = {
  integrations: [],
  metrics: [],
  alertRules: [],
  alerts: [],
  paidSessions: [],
};

let stateQueue: Promise<void> = Promise.resolve();

async function ensureStateFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STATE_PATH);
  } catch {
    await fs.writeFile(STATE_PATH, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
  }
}

function normalizeState(state: AppState): AppState {
  return {
    integrations: state.integrations,
    metrics: state.metrics.slice(-MAX_METRICS),
    alertRules: state.alertRules,
    alerts: state.alerts.slice(-MAX_ALERTS),
    paidSessions: state.paidSessions.slice(-MAX_SESSIONS),
  };
}

async function readStateInternal(): Promise<AppState> {
  await ensureStateFile();
  const raw = await fs.readFile(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw) as AppState;
  return {
    integrations: parsed.integrations ?? [],
    metrics: parsed.metrics ?? [],
    alertRules: parsed.alertRules ?? [],
    alerts: parsed.alerts ?? [],
    paidSessions: parsed.paidSessions ?? [],
  };
}

async function writeStateInternal(state: AppState): Promise<void> {
  await ensureStateFile();
  const normalized = normalizeState(state);
  const tempPath = `${STATE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf8");
  await fs.rename(tempPath, STATE_PATH);
}

export async function readAppState(): Promise<AppState> {
  return readStateInternal();
}

export async function updateAppState(
  updater: (state: AppState) => AppState,
): Promise<AppState> {
  let resultState: AppState = DEFAULT_STATE;

  const task = stateQueue.then(async () => {
    const current = await readStateInternal();
    const next = normalizeState(updater(current));
    await writeStateInternal(next);
    resultState = next;
  });

  stateQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;
  return resultState;
}

export function createMetricSnapshot(
  provider: IntegrationProvider,
  metricKey: string,
  value: number,
): MetricSnapshot {
  return {
    id: randomUUID(),
    provider,
    metricKey,
    value,
    capturedAt: new Date().toISOString(),
  };
}

export function createAlertRule(
  partial: Omit<AlertRule, "id" | "createdAt" | "updatedAt">,
): AlertRule {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createAlertEvent(
  partial: Omit<AlertEvent, "id" | "createdAt" | "delivered" | "deliveryError">,
): AlertEvent {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    delivered: false,
    deliveryError: null,
    ...partial,
  };
}

export function createPaymentRecord(sessionId: string, email?: string | null): PaymentRecord {
  return {
    sessionId,
    email: email ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function sanitizeIntegration(integration: IntegrationRecord): IntegrationRecord {
  const sanitizedConfig: Record<string, string | string[] | boolean> = {};

  Object.entries(integration.config).forEach(([key, value]) => {
    if (/secret|private|token|password|key/i.test(key)) {
      sanitizedConfig[key] = "configured";
    } else {
      sanitizedConfig[key] = value;
    }
  });

  return {
    ...integration,
    config: sanitizedConfig,
  };
}
