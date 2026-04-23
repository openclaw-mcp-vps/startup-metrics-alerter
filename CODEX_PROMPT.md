# Build Task: startup-metrics-alerter

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: startup-metrics-alerter
HEADLINE: Get alerts when startup KPIs drop
WHAT: Connects to analytics tools and sends smart alerts when key metrics decline unexpectedly
WHY: Founders miss critical metric drops until it's too late because they don't monitor dashboards daily
WHO PAYS: Early-stage startup founders
NICHE: startup-tools
PRICE: $$49/mo

ARCHITECTURE SPEC:
A Next.js SaaS application that connects to analytics APIs (Google Analytics, Mixpanel, etc.) to monitor startup KPIs and sends intelligent alerts via email/Slack when metrics drop below expected thresholds. Uses background jobs to periodically fetch data, ML-based anomaly detection for smart alerting, and Lemon Squeezy for subscription billing.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/auth/[...nextauth]/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- app/api/integrations/google-analytics/route.ts
- app/api/integrations/mixpanel/route.ts
- app/api/alerts/route.ts
- app/api/cron/check-metrics/route.ts
- lib/analytics-connectors.ts
- lib/alert-engine.ts
- lib/anomaly-detection.ts
- lib/notification-service.ts
- lib/lemonsqueezy.ts
- components/MetricCard.tsx
- components/AlertSettings.tsx
- components/IntegrationSetup.tsx
- components/PricingCard.tsx
- prisma/schema.prisma

DEPENDENCIES: next, react, typescript, tailwindcss, prisma, @prisma/client, next-auth, googleapis, mixpanel, @lemonsqueezy/lemonsqueezy.js, resend, zod, recharts, lucide-react, date-fns, simple-statistics

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Stripe Payment Link for payments (hosted checkout — use the URL directly as the Buy button href)
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_STRIPE_PAYMENT_LINK  (full URL, e.g. https://buy.stripe.com/test_XXX)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (pk_test_... or pk_live_...)
- STRIPE_WEBHOOK_SECRET  (set when webhook is wired)

BUY BUTTON RULE: the Buy button's href MUST be `process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK`
used as-is — do NOT construct URLs from a product ID, do NOT prepend any base URL,
do NOT wrap it in an embed iframe. The link opens Stripe's hosted checkout directly.

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
