import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  listIntegrations,
  removeIntegration,
  saveIntegration,
  setIntegrationEnabled,
} from "@/lib/database";
import { ensurePaidAccess } from "@/lib/request-auth";

const createSchema = z.object({
  action: z.literal("create"),
  provider: z.enum(["google-analytics", "mixpanel"]),
  name: z.string().min(3).max(80),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

const toggleSchema = z.object({
  action: z.literal("toggle"),
  id: z.string().uuid(),
  enabled: z.boolean(),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().uuid(),
});

const actionSchema = z.union([createSchema, toggleSchema, deleteSchema]);

export async function GET(request: NextRequest) {
  const authError = ensurePaidAccess(request);
  if (authError) {
    return authError;
  }

  const integrations = await listIntegrations();
  return NextResponse.json({ integrations });
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

  if (payload.action === "create") {
    const normalizedConfig = Object.fromEntries(
      Object.entries(payload.config).map(([key, value]) => [key, String(value)]),
    );

    const integration = await saveIntegration({
      provider: payload.provider,
      name: payload.name,
      config: normalizedConfig,
      enabled: true,
    });

    return NextResponse.json({ integration });
  }

  if (payload.action === "toggle") {
    const integration = await setIntegrationEnabled(payload.id, payload.enabled);

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json({ integration });
  }

  const removed = await removeIntegration(payload.id);

  if (!removed) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
