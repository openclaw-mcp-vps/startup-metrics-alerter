import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import type { MetricKey } from "@/lib/types";

interface MetricCardProps {
  metricKey: MetricKey;
  title: string;
  value: number | null;
  changePercent: number | null;
}

function formatMetric(metricKey: MetricKey, value: number | null) {
  if (value === null) {
    return "No data yet";
  }

  if (metricKey === "mrr") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (metricKey === "activation_rate" || metricKey === "trial_to_paid" || metricKey === "churn_rate") {
    return `${value.toFixed(2)}%`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function MetricCard({ metricKey, title, value, changePercent }: MetricCardProps) {
  const isDrop = (changePercent ?? 0) < 0;
  const isCritical = (changePercent ?? 0) <= -12;

  return (
    <article className="rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-5 shadow-[0_0_0_1px_rgba(240,246,252,0.02)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium tracking-wide text-[#8b949e]">{title}</h3>
        {isCritical ? (
          <AlertTriangle className="h-4 w-4 text-[#ff7b72]" />
        ) : isDrop ? (
          <TrendingDown className="h-4 w-4 text-[#ff7b72]" />
        ) : (
          <TrendingUp className="h-4 w-4 text-[#3fb950]" />
        )}
      </div>

      <div className="text-3xl font-semibold text-[#f0f6fc]">{formatMetric(metricKey, value)}</div>

      <p className="mt-3 text-xs tracking-wide text-[#8b949e]">
        {changePercent === null
          ? "Waiting for trend data"
          : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% vs previous reading`}
      </p>
    </article>
  );
}
