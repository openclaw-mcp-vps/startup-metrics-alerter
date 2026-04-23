import { NextResponse } from "next/server";
import { z } from "zod";

import { setPaidAccessCookie } from "@/lib/paywall";
import { readAppState } from "@/lib/storage";

export const runtime = "nodejs";

const activateSchema = z.object({
  sessionId: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = activateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session ID payload." }, { status: 400 });
  }

  const state = await readAppState();
  const found = state.paidSessions.find(
    (entry) => entry.sessionId === parsed.data.sessionId,
  );

  if (!found) {
    return NextResponse.json(
      {
        error:
          "Session not found yet. Wait 10-20 seconds for Stripe webhook delivery, then retry.",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ granted: true });
  setPaidAccessCookie(response, parsed.data.sessionId);
  return response;
}
