import { Check } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const planHighlights = [
  "Monitor Google Analytics + Mixpanel KPIs in one dashboard",
  "Automatic drop detection tuned to each metric's baseline",
  "Instant Slack or email alerts with severity classification",
  "Cron-ready endpoint for scheduled metric checks",
  "Unlimited alert rules for acquisition, activation, and revenue",
];

export function PricingCard() {
  const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <Card className="border-orange-400/40 bg-slate-950/70">
      <CardHeader>
        <p className="text-sm font-semibold uppercase tracking-wider text-orange-300">
          Startup Tools Plan
        </p>
        <CardTitle className="text-3xl">$49/mo</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm text-slate-200">
          {planHighlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-orange-300" aria-hidden />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <a
          href={checkoutUrl ?? ""}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
        >
          Buy Startup Metrics Alerter
        </a>
        {!checkoutUrl ? (
          <p className="text-xs text-rose-300">
            Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout.
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
