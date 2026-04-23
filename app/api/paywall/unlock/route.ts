import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  findLatestPurchaseByEmail,
  findPurchaseBySessionId,
} from "@/lib/database";
import { issueAccessCookie } from "@/lib/paywall";

const payloadSchema = z.object({
  sessionId: z.string().optional(),
  email: z.string().email().optional(),
});

async function resolvePurchase(payload: z.infer<typeof payloadSchema>) {
  if (payload.sessionId) {
    return findPurchaseBySessionId(payload.sessionId);
  }

  if (payload.email) {
    return findLatestPurchaseByEmail(payload.email);
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid sessionId or purchase email." }, { status: 400 });
  }

  if (!parsed.data.sessionId && !parsed.data.email) {
    return NextResponse.json(
      { error: "sessionId or email is required." },
      { status: 400 },
    );
  }

  const purchase = await resolvePurchase(parsed.data);

  if (!purchase) {
    return NextResponse.json(
      {
        error:
          "No completed checkout found yet. Wait for webhook delivery, then try again.",
      },
      { status: 404 },
    );
  }

  const response = NextResponse.json({
    unlocked: true,
    email: purchase.email,
    purchasedAt: purchase.createdAt,
  });

  issueAccessCookie(response, purchase.email, purchase.sessionId);

  return response;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? undefined;
  const email = request.nextUrl.searchParams.get("email") ?? undefined;

  const payload = payloadSchema.safeParse({ sessionId, email });

  if (!payload.success || (!payload.data.sessionId && !payload.data.email)) {
    return NextResponse.json({ error: "Provide session_id or email" }, { status: 400 });
  }

  const purchase = await resolvePurchase(payload.data);

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  issueAccessCookie(response, purchase.email, purchase.sessionId);
  return response;
}
