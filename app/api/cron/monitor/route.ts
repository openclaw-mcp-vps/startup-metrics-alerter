import { NextRequest, NextResponse } from "next/server";

import { runMonitoringCycle } from "@/lib/alert-engine";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runMonitoringCycle("cron");
  return NextResponse.json({ ok: true, result });
}
