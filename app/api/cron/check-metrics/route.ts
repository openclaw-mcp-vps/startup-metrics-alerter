import { NextResponse } from "next/server";

import { requirePaidApiAccess } from "@/lib/api-auth";
import { evaluateAlertRules } from "@/lib/alert-engine";
import { fetchMetricsForIntegration } from "@/lib/analytics-connectors";
import { deliverAlerts } from "@/lib/notification-service";
import { readAppState, updateAppState } from "@/lib/storage";
import type { IntegrationRecord, MetricSnapshot } from "@/lib/types";

export const runtime = "nodejs";

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
}

async function ensureAuthorized(request: Request): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return null;
  }

  const denied = await requirePaidApiAccess();

  if (denied) {
    return cronSecret ? unauthorizedResponse() : denied;
  }

  return null;
}

async function runMetricCheck(request: Request) {
  const authDenied = await ensureAuthorized(request);
  if (authDenied) {
    return authDenied;
  }

  const state = await readAppState();
  const integrations = state.integrations.filter((entry) => entry.enabled);

  if (integrations.length === 0) {
    return NextResponse.json({ fetched: 0, alerts: 0, errors: [] });
  }

  const freshMetrics: MetricSnapshot[] = [];
  const integrationErrors: Array<{ provider: IntegrationRecord["provider"]; error: string }> = [];

  for (const integration of integrations) {
    try {
      const metrics = await fetchMetricsForIntegration(integration);
      freshMetrics.push(...metrics);
    } catch (error) {
      integrationErrors.push({
        provider: integration.provider,
        error: error instanceof Error ? error.message : "Unknown integration error",
      });
    }
  }

  const generatedAlerts = evaluateAlertRules(state, freshMetrics);
  const deliveredAlerts = await deliverAlerts(generatedAlerts);

  await updateAppState((current) => {
    const nextIntegrations = current.integrations.map((integration) => {
      const errorEntry = integrationErrors.find(
        (entry) => entry.provider === integration.provider,
      );

      return {
        ...integration,
        updatedAt: new Date().toISOString(),
        lastError: errorEntry?.error ?? null,
      };
    });

    return {
      ...current,
      integrations: nextIntegrations,
      metrics: [...current.metrics, ...freshMetrics],
      alerts: [...current.alerts, ...deliveredAlerts],
    };
  });

  return NextResponse.json({
    fetched: freshMetrics.length,
    alerts: deliveredAlerts.length,
    integrationErrors,
  });
}

export async function GET(request: Request) {
  return runMetricCheck(request);
}

export async function POST(request: Request) {
  return runMetricCheck(request);
}
