import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePaidApiAccess } from "@/lib/api-auth";
import { fetchMixpanelMetrics } from "@/lib/analytics-connectors";
import { readAppState, sanitizeIntegration, updateAppState } from "@/lib/storage";
import type { IntegrationRecord } from "@/lib/types";

export const runtime = "nodejs";

const mixpanelSchema = z.object({
  apiSecret: z.string().min(10),
  eventName: z.string().min(2),
  projectToken: z.string().optional(),
});

function buildIntegrationRecord(
  existing: IntegrationRecord | undefined,
  payload: z.infer<typeof mixpanelSchema>,
  error: string | null,
): IntegrationRecord {
  const now = new Date().toISOString();

  return {
    provider: "mixpanel",
    enabled: !error,
    connectedAt: error ? existing?.connectedAt ?? null : now,
    updatedAt: now,
    lastError: error,
    config: {
      apiSecret: payload.apiSecret,
      eventName: payload.eventName,
      projectToken: payload.projectToken ?? "",
    },
  };
}

export async function GET() {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const state = await readAppState();
  const integration = state.integrations.find((entry) => entry.provider === "mixpanel");

  return NextResponse.json({
    integration: integration ? sanitizeIntegration(integration) : null,
    recentMetrics: state.metrics
      .filter((metric) => metric.provider === "mixpanel")
      .slice(-30),
  });
}

export async function POST(request: Request) {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json().catch(() => null);
  const parsed = mixpanelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Mixpanel credentials payload." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const metrics = await fetchMixpanelMetrics(data);

    const nextState = await updateAppState((state) => {
      const existing = state.integrations.find((entry) => entry.provider === "mixpanel");

      const integration = buildIntegrationRecord(existing, data, null);

      return {
        ...state,
        integrations: [
          ...state.integrations.filter((entry) => entry.provider !== "mixpanel"),
          integration,
        ],
        metrics: [...state.metrics, ...metrics],
      };
    });

    return NextResponse.json({
      integration: sanitizeIntegration(
        nextState.integrations.find((entry) => entry.provider === "mixpanel")!,
      ),
      fetchedMetrics: metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mixpanel request failed.";

    await updateAppState((state) => {
      const existing = state.integrations.find((entry) => entry.provider === "mixpanel");

      const integration = buildIntegrationRecord(existing, data, message);

      return {
        ...state,
        integrations: [
          ...state.integrations.filter((entry) => entry.provider !== "mixpanel"),
          integration,
        ],
      };
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
