import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureLocalMonitorScheduler, runMonitoringCycle } from "@/lib/alert-engine";
import { getAlertSettings, listAlertEvents, updateAlertSettings } from "@/lib/database";
import { ensurePaidAccess } from "@/lib/request-auth";
import { METRIC_KEYS } from "@/lib/types";

const settingsSchema = z.object({
  dropThresholdPercent: z.number().min(5).max(80).optional(),
  minConfidence: z.number().min(0.3).max(0.99).optional(),
  lookbackDays: z.number().min(7).max(90).optional(),
  monitoredMetrics: z.array(z.enum(METRIC_KEYS)).min(1).optional(),
  emailTo: z.string().optional(),
  slackWebhookUrl: z.string().optional(),
  timezone: z.string().min(2).max(64).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

const updateActionSchema = z.object({
  action: z.literal("update"),
  settings: settingsSchema,
});

const runNowActionSchema = z.object({
  action: z.literal("run-now"),
});

const actionSchema = z.union([updateActionSchema, runNowActionSchema]);

export async function GET(request: NextRequest) {
  const authError = ensurePaidAccess(request);
  if (authError) {
    return authError;
  }

  ensureLocalMonitorScheduler();

  const [settings, alerts] = await Promise.all([getAlertSettings(), listAlertEvents(30)]);

  return NextResponse.json({ settings, alerts });
}

export async function POST(request: NextRequest) {
  const authError = ensurePaidAccess(request);
  if (authError) {
    return authError;
  }

  const body = await request.json();
  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.action === "update") {
    const settings = await updateAlertSettings(payload.settings);
    return NextResponse.json({ settings });
  }

  const result = await runMonitoringCycle("manual");
  return NextResponse.json({ result });
}
