import crypto from "node:crypto";

import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { z } from "zod";

const lemonWebhookSchema = z.object({
  meta: z.object({
    event_name: z.string(),
  }),
  data: z.object({
    id: z.string().or(z.number()),
  }),
});

export function configureLemonSqueezy(): void {
  if (process.env.LEMONSQUEEZY_API_KEY) {
    lemonSqueezySetup({
      apiKey: process.env.LEMONSQUEEZY_API_KEY,
      onError: (error) => {
        console.error("Lemon Squeezy client error", error);
      },
    });
  }
}

export function verifyLemonSqueezySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return digest === signature;
}

export function parseLemonSqueezyWebhook(payload: string): {
  eventName: string;
  eventId: string;
} {
  const parsed = lemonWebhookSchema.parse(JSON.parse(payload));

  return {
    eventName: parsed.meta.event_name,
    eventId: String(parsed.data.id),
  };
}
