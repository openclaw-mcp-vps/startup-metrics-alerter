import { NextResponse } from "next/server";
import Stripe from "stripe";

import { recordPurchase } from "@/lib/database";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_webhook_only");

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature header." },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const email =
      session.customer_details?.email ??
      session.customer_email ??
      (typeof session.customer === "string" ? session.customer : "") ??
      "";

    if (!sessionId || !email) {
      return NextResponse.json({ received: true, skipped: "Missing purchaser email" });
    }

    await recordPurchase({
      sessionId,
      email,
      amountTotal: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
    });
  }

  return NextResponse.json({ received: true });
}
