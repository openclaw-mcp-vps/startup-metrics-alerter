import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(
      process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder_for_webhook_verification",
    );
  }

  return stripeClient;
}
