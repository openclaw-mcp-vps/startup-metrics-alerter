import { NextResponse } from "next/server";
import { z } from "zod";

import { createPaymentRecord, updateAppState } from "@/lib/storage";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const checkoutSessionSchema = z.object({
  id: z.string(),
  payment_status: z.string().optional(),
  customer_details: z
    .object({
      email: z.string().email().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe signature or STRIPE_WEBHOOK_SECRET missing." },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event;

  try {
    event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = checkoutSessionSchema.parse(event.data.object);

    if (session.payment_status && session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: true });
    }

    await updateAppState((state) => {
      if (state.paidSessions.some((entry) => entry.sessionId === session.id)) {
        return state;
      }

      return {
        ...state,
        paidSessions: [
          ...state.paidSessions,
          createPaymentRecord(session.id, session.customer_details?.email ?? null),
        ],
      };
    });
  }

  return NextResponse.json({ received: true });
}
