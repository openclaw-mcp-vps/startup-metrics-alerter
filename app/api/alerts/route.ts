import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePaidApiAccess } from "@/lib/api-auth";
import { readAppState, sanitizeIntegration, updateAppState } from "@/lib/storage";
import type { AlertRule } from "@/lib/types";

export const runtime = "nodejs";

const alertRuleSchema = z.object({
  id: z.string().optional(),
  provider: z.enum(["google-analytics", "mixpanel"]),
  metricKey: z.string().min(1),
  minDropPercent: z.number().min(5).max(90),
  lookbackPoints: z.number().min(3).max(60),
  channel: z.enum(["email", "slack"]),
  target: z.string().min(3),
  enabled: z.boolean().default(true),
});

function createRule(payload: z.infer<typeof alertRuleSchema>): AlertRule {
  const now = new Date().toISOString();

  return {
    id: payload.id ?? randomUUID(),
    provider: payload.provider,
    metricKey: payload.metricKey,
    minDropPercent: payload.minDropPercent,
    lookbackPoints: payload.lookbackPoints,
    channel: payload.channel,
    target: payload.target,
    enabled: payload.enabled,
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET() {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const state = await readAppState();

  return NextResponse.json({
    rules: state.alertRules,
    alerts: state.alerts.slice(-120),
    metrics: state.metrics.slice(-400),
    integrations: state.integrations.map(sanitizeIntegration),
  });
}

export async function POST(request: Request) {
  const denied = await requirePaidApiAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json().catch(() => null);
  const parsed = alertRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid alert rule payload." }, { status: 400 });
  }

  const payload = parsed.data;

  const nextState = await updateAppState((state) => {
    const existingRule = payload.id
      ? state.alertRules.find((rule) => rule.id === payload.id)
      : null;

    if (existingRule) {
      const updatedRule: AlertRule = {
        ...existingRule,
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        alertRules: state.alertRules.map((rule) =>
          rule.id === updatedRule.id ? updatedRule : rule,
        ),
      };
    }

    const newRule = createRule(payload);

    return {
      ...state,
      alertRules: [...state.alertRules, newRule],
    };
  });

  return NextResponse.json({ rules: nextState.alertRules });
}
