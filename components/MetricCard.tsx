import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  metric: string;
  provider: string;
  value: number;
  dropPercent?: number;
}

function formatMetricValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return value.toFixed(2);
}

export function MetricCard({
  metric,
  provider,
  value,
  dropPercent = 0,
}: MetricCardProps) {
  const isNegative = dropPercent > 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
          <span>{provider}</span>
          <span>{metric}</span>
        </div>

        <p className="text-3xl font-semibold text-slate-100">{formatMetricValue(value)}</p>

        <p
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
            isNegative
              ? "bg-rose-500/15 text-rose-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {isNegative ? (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          )}
          {isNegative ? `${dropPercent.toFixed(1)}% below baseline` : "Healthy trend"}
        </p>
      </CardContent>
    </Card>
  );
}
