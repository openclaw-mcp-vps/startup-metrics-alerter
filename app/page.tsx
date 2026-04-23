import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  BellRing,
  Bot,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { hasPaywallAccess } from "@/lib/paywall";

const faqs = [
  {
    question: "How quickly do alerts fire after a KPI drop?",
    answer:
      "The monitor runs every 30 minutes by default. You can trigger a manual run instantly from the dashboard whenever you deploy a new campaign or pricing test.",
  },
  {
    question: "Will I get noisy alerts from random daily swings?",
    answer:
      "The alert engine compares current values against an adaptive baseline and confidence score, then suppresses duplicate alerts for 12 hours to reduce false positives.",
  },
  {
    question: "Which metrics can I track?",
    answer:
      "Out of the box: MRR, signups, activation rate, trial-to-paid conversion, and churn. You can map each one to Google Analytics or Mixpanel fields/events.",
  },
  {
    question: "Can I send alerts to both email and Slack?",
    answer:
      "Yes. Configure one or both channels in Alert Rules. You can also set quiet hours so alerts queue instead of pinging your team overnight.",
  },
];

export default async function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const hasAccess = await hasPaywallAccess();

  return (
    <main className="relative overflow-hidden bg-[#0d1117]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(31,111,235,0.25),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(63,185,80,0.16),transparent_45%),linear-gradient(180deg,rgba(13,17,23,1),rgba(13,17,23,0.98))]" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-24 pt-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between rounded-2xl border border-[#30363d] bg-[#161b22]/70 px-4 py-3 backdrop-blur">
          <p className="text-sm font-semibold tracking-wide text-[#f0f6fc]">Startup Metrics Alerter</p>
          <nav className="flex items-center gap-4 text-sm text-[#8b949e]">
            <a href="#problem" className="hover:text-[#f0f6fc]">
              Problem
            </a>
            <a href="#solution" className="hover:text-[#f0f6fc]">
              Solution
            </a>
            <a href="#pricing" className="hover:text-[#f0f6fc]">
              Pricing
            </a>
            <Link href={hasAccess ? "/dashboard" : "/dashboard/unlock"} className="rounded-lg bg-[#1f6feb] px-3 py-1.5 font-semibold text-white hover:bg-[#388bfd]">
              {hasAccess ? "Dashboard" : "Unlock"}
            </Link>
          </nav>
        </header>

        <section className="grid gap-10 pb-14 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs font-semibold tracking-wide text-[#79c0ff]">
              <BellRing className="h-3.5 w-3.5" />
              Founder-focused KPI monitoring
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#f0f6fc] sm:text-5xl">
              Get alerts when startup KPIs drop before the damage compounds.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#c9d1d9]">
              Startup Metrics Alerter connects to Google Analytics and Mixpanel, models expected
              ranges for your core KPIs, and sends smart alerts when momentum slips. No more
              discovering churn spikes three days late.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={paymentLink}
                className="rounded-xl bg-[#238636] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
              >
                Start for $49/month
              </a>
              <Link
                href={hasAccess ? "/dashboard" : "/dashboard/unlock"}
                className="rounded-xl border border-[#58a6ff] px-5 py-3 text-sm font-semibold text-[#79c0ff] transition hover:bg-[#1f2937]"
              >
                {hasAccess ? "Open dashboard" : "I already purchased"}
              </Link>
            </div>

            <p className="mt-3 text-xs text-[#8b949e]">
              Buy button opens Stripe hosted checkout directly. Configure the payment link success
              URL to <span className="font-mono text-[#c9d1d9]">/dashboard/unlock?session_id=&#123;CHECKOUT_SESSION_ID&#125;</span> to auto-unlock.
            </p>
          </div>

          <div className="rounded-3xl border border-[#30363d] bg-[#161b22]/80 p-6 shadow-[0_25px_80px_-35px_rgba(1,4,9,0.9)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
                <p className="text-xs uppercase tracking-wide text-[#8b949e]">MRR</p>
                <p className="mt-2 text-2xl font-semibold text-[#f0f6fc]">$42,180</p>
                <p className="mt-1 text-xs text-[#ff7b72]">-18.4% vs baseline</p>
              </div>
              <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
                <p className="text-xs uppercase tracking-wide text-[#8b949e]">Activation</p>
                <p className="mt-2 text-2xl font-semibold text-[#f0f6fc]">31.2%</p>
                <p className="mt-1 text-xs text-[#ff7b72]">-12.1% vs baseline</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
              <p className="text-sm font-semibold text-[#f0f6fc]">Latest alert summary</p>
              <p className="mt-2 text-sm leading-relaxed text-[#c9d1d9]">
                Signup velocity dropped for six consecutive hours while paid acquisition spend stayed
                flat. Estimated weekly pipeline impact: 57 fewer trials if trend continues.
              </p>
            </div>
          </div>
        </section>

        <section id="problem" className="rounded-3xl border border-[#30363d] bg-[#161b22]/60 p-8">
          <h2 className="text-2xl font-semibold text-[#f0f6fc]">The Problem</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <AlertCircle className="h-5 w-5 text-[#ff7b72]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Dashboard fatigue</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                Founders rarely check every dashboard every day, so dangerous drops stay invisible
                until weekly reviews.
              </p>
            </article>
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <ShieldAlert className="h-5 w-5 text-[#f2cc60]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">False alarms</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                Static threshold alerts fire too often on normal variance, so teams mute them and miss
                real issues.
              </p>
            </article>
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <BarChart3 className="h-5 w-5 text-[#58a6ff]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Delayed fixes</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                By the time drops are spotted, cohort quality and revenue recovery usually take weeks.
              </p>
            </article>
          </div>
        </section>

        <section id="solution" className="mt-10 rounded-3xl border border-[#30363d] bg-[#161b22]/60 p-8">
          <h2 className="text-2xl font-semibold text-[#f0f6fc]">The Solution</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <CheckCircle2 className="h-5 w-5 text-[#3fb950]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Multi-source KPI sync</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                Pull trends from Google Analytics and Mixpanel in one place, with clear mapping to
                MRR, activation, signups, trial-to-paid, and churn.
              </p>
            </article>
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <Bot className="h-5 w-5 text-[#a371f7]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Adaptive anomaly scoring</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                An ML-style scoring model compares live values against moving baselines and confidence
                bands to reduce noise.
              </p>
            </article>
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <BellRing className="h-5 w-5 text-[#f2cc60]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Actionable alerting</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                Send concise alert context to email and Slack with current value, expected value, and
                estimated drop magnitude.
              </p>
            </article>
            <article className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
              <ShieldAlert className="h-5 w-5 text-[#79c0ff]" />
              <h3 className="mt-3 text-base font-semibold text-[#f0f6fc]">Paywalled founder workspace</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                Dashboard access is locked behind verified checkout and secure cookie-based unlock, so
                your monitoring setup stays private.
              </p>
            </article>
          </div>
        </section>

        <section id="pricing" className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-[#30363d] bg-[#161b22]/60 p-8">
            <h2 className="text-2xl font-semibold text-[#f0f6fc]">Simple pricing</h2>
            <p className="mt-2 text-sm text-[#8b949e]">
              Built for early-stage founders who need reliable monitoring without enterprise tooling
              overhead.
            </p>
            <p className="mt-6 text-5xl font-semibold text-[#f0f6fc]">
              $49<span className="text-lg text-[#8b949e]">/month</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#c9d1d9]">
              <li>Unlimited monitor runs</li>
              <li>Google Analytics + Mixpanel integrations</li>
              <li>Email + Slack alert channels</li>
              <li>Anomaly confidence controls and quiet hours</li>
              <li>Metric history and trend visualization</li>
            </ul>
            <a
              href={paymentLink}
              className="mt-7 inline-flex rounded-xl bg-[#238636] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
            >
              Buy with Stripe
            </a>
          </div>

          <div className="rounded-3xl border border-[#30363d] bg-[#161b22]/60 p-8">
            <h2 className="text-2xl font-semibold text-[#f0f6fc]">FAQ</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((item) => (
                <article key={item.question} className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4">
                  <h3 className="text-sm font-semibold text-[#f0f6fc]">{item.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8b949e]">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
