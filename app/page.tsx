import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  ChartNoAxesCombined,
  Clock,
  ShieldCheck,
} from "lucide-react";

import { CheckoutSessionActivator } from "@/components/CheckoutSessionActivator";
import { PricingCard } from "@/components/PricingCard";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

const faqs = [
  {
    question: "Which KPIs can I monitor?",
    answer:
      "Any metric your Google Analytics 4 property or Mixpanel project exposes, including sessions, activation events, signups, and funnel milestones.",
  },
  {
    question: "How are alerts triggered?",
    answer:
      "Each metric gets a rolling baseline. If current values drop below your configured threshold and statistical lower bound, an alert is fired.",
  },
  {
    question: "How do I receive notifications?",
    answer:
      "You can route alerts to founder email addresses through Resend or directly into Slack using incoming webhook URLs.",
  },
  {
    question: "Will this work with Stripe Payment Links?",
    answer:
      "Yes. The pricing button opens Stripe hosted checkout directly. After successful payment, Stripe webhook confirmation unlocks dashboard access via secure cookie.",
  },
];

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasAccess = verifyAccessToken(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value,
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-10 md:px-10">
      <header className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-[0_0_0_1px_rgba(148,163,184,0.05)] md:p-12">
        <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-300">
          <BellRing className="h-3.5 w-3.5" aria-hidden />
          Startup Tools
        </p>

        <div className="max-w-3xl space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
            Get alerts when startup KPIs drop
          </h1>
          <p className="text-lg leading-relaxed text-slate-300 md:text-xl">
            Startup Metrics Alerter connects your analytics stack, learns normal KPI behavior, and warns you immediately when growth indicators deteriorate.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={hasAccess ? "/dashboard" : "#pricing"}
            className="inline-flex h-11 items-center justify-center rounded-md bg-orange-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            {hasAccess ? "Open Dashboard" : "See Pricing"}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="#solution"
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Explore How It Works
          </Link>
        </div>

        <CheckoutSessionActivator />
      </header>

      <section id="problem" className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <Clock className="h-5 w-5 text-orange-300" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold text-slate-100">Problem</h2>
          <p className="mt-2 text-sm text-slate-300">
            Founders don&apos;t check dashboards every day. Performance issues go unnoticed for days until signups and revenue already crater.
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <AlertTriangle className="h-5 w-5 text-orange-300" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold text-slate-100">Impact</h2>
          <p className="mt-2 text-sm text-slate-300">
            Late detection means delayed campaigns, slow debugging, and avoidable churn. Every missed day compounds your CAC and burn.
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <ShieldCheck className="h-5 w-5 text-orange-300" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold text-slate-100">Outcome</h2>
          <p className="mt-2 text-sm text-slate-300">
            Catch downturns within hours, not weeks. Fix broken funnels before they become missed runway milestones.
          </p>
        </article>
      </section>

      <section id="solution" className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-300">
            Solution
          </p>
          <h2 className="text-3xl font-semibold text-slate-50 md:text-4xl">
            Anomaly-aware KPI monitoring built for early-stage founders
          </h2>
          <p className="text-slate-300">
            Connect your analytics tools once, define risk thresholds, and let automated checks evaluate every metric against expected performance bands.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <ChartNoAxesCombined className="h-5 w-5 text-orange-300" aria-hidden />
            <h3 className="mt-3 font-semibold text-slate-100">Unified Data</h3>
            <p className="mt-2 text-sm text-slate-300">
              Pull sessions, active users, and event conversions from Google Analytics and Mixpanel into one founder dashboard.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <BellRing className="h-5 w-5 text-orange-300" aria-hidden />
            <h3 className="mt-3 font-semibold text-slate-100">Smart Alerting</h3>
            <p className="mt-2 text-sm text-slate-300">
              Detect statistically significant drops instead of noisy threshold spam. Severity prioritization highlights true emergencies.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <Clock className="h-5 w-5 text-orange-300" aria-hidden />
            <h3 className="mt-3 font-semibold text-slate-100">Scheduled Checks</h3>
            <p className="mt-2 text-sm text-slate-300">
              Trigger metric checks on a cron schedule so KPI protection runs continuously, even while your team sleeps.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-start">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-300">
            Pricing
          </p>
          <h2 className="text-3xl font-semibold text-slate-50 md:text-4xl">
            One plan, built for founder speed
          </h2>
          <p className="text-slate-300">
            Pay monthly, connect your metrics stack, and get immediate protection against hidden KPI regressions.
          </p>
        </div>

        <PricingCard />
      </section>

      <section id="faq" className="space-y-4">
        <h2 className="text-3xl font-semibold text-slate-50">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <h3 className="text-base font-semibold text-slate-100">{faq.question}</h3>
              <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
