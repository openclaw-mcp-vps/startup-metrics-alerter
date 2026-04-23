import { NextResponse } from "next/server";

import {
  parseLemonSqueezyWebhook,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (secret && !verifyLemonSqueezySignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 400 });
  }

  try {
    const parsed = parseLemonSqueezyWebhook(payload);

    return NextResponse.json({
      received: true,
      event: parsed.eventName,
      message:
        "Lemon Squeezy webhook received. Stripe Payment Links are the active billing flow for dashboard access.",
    });
  } catch {
    return NextResponse.json({
      received: true,
      message:
        "Webhook received but payload format was not recognized. Stripe Payment Links remain the primary checkout path.",
    });
  }
}
