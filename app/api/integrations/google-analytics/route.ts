import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePaidApiAccess } from "@/lib/api-auth";
import { fetchGoogleAnalyticsMetrics } from "@/lib/analytics-connectors";
import { readAppState, sanitizeIntegration, updateAppState } from "@/lib/storage";
import type { IntegrationRecord } from "@/lib/types";

export const runtime = "nodejs";

const googleAnalyticsSchema = z.object({
  propertyId: z.string().min(4),
  serviceAccountEmail: z.string().email(),
  serviceAccountPrivateKey: z.string().min(20),
  metricNames: z.array(z.string().min(1)).min(1),
});

function buildIntegrationRecord(
  existing: IntegrationRecord | undefined,
  payload: z.infer<typeof googleAnalyticsSchema>,
  error: string | null,
): IntegrationRecord {
  const now = new Date().toISOString();

  return {
    provider: "google-analytics",
    enabled: !error,
    connectedAt: error ? existing?.connectedAt ?? null : now,
    updatedAt: now,
    lastError: error,
    config: {
      propertyId: payload.propertyId,
      serviceAccountEmail: payload.serviceAccountEmail,
      serviceAccountPrivateKey: payload.serviceAccountPrivateKey,
      metricNames: payload.metricNames,
    },
  };
}

export async function GET() {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const state = await readAppState();
  const integration = state.integrations.find(
    (entry) => entry.provider === "google-analytics",
  );

  return NextResponse.json({
    integration: integration ? sanitizeIntegration(integration) : null,
    recentMetrics: state.metrics
      .filter((metric) => metric.provider === "google-analytics")
      .slice(-30),
  });
}

export async function POST(request: Request) {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json().catch(() => null);
  const parsed = googleAnalyticsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Google Analytics credentials payload." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const metrics = await fetchGoogleAnalyticsMetrics(data);

    const nextState = await updateAppState((state) => {
      const existing = state.integrations.find(
        (entry) => entry.provider === "google-analytics",
      );

      const integration = buildIntegrationRecord(existing, data, null);

      return {
        ...state,
        integrations: [
          ...state.integrations.filter((entry) => entry.provider !== "google-analytics"),
          integration,
        ],
        metrics: [...state.metrics, ...metrics],
      };
    });

    return NextResponse.json({
      integration: sanitizeIntegration(
        nextState.integrations.find((entry) => entry.provider === "google-analytics")!,
      ),
      fetchedMetrics: metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Analytics request failed.";

    await updateAppState((state) => {
      const existing = state.integrations.find(
        (entry) => entry.provider === "google-analytics",
      );

      const integration = buildIntegrationRecord(existing, data, message);

      return {
        ...state,
        integrations: [
          ...state.integrations.filter((entry) => entry.provider !== "google-analytics"),
          integration,
        ],
      };
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
