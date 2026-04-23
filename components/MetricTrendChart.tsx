"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricKey } from "@/lib/types";

interface MetricTrendChartProps {
  data: Array<Record<string, number | string>>;
  metricKeys: MetricKey[];
}

const lineColors: Record<MetricKey, string> = {
  mrr: "#58a6ff",
  signups: "#3fb950",
  activation_rate: "#a371f7",
  trial_to_paid: "#f2cc60",
  churn_rate: "#ff7b72",
};

const lineNames: Record<MetricKey, string> = {
  mrr: "MRR",
  signups: "Signups",
  activation_rate: "Activation %",
  trial_to_paid: "Trial→Paid %",
  churn_rate: "Churn %",
};

function formatXAxis(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
}

export function MetricTrendChart({ data, metricKeys }: MetricTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#30363d] bg-[#161b22]/40 p-10 text-center text-sm text-[#8b949e]">
        No trend data yet. Connect at least one integration and run your first sync.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#30363d" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="#8b949e"
            minTickGap={18}
          />
          <YAxis stroke="#8b949e" width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: "12px",
              color: "#f0f6fc",
            }}
            labelFormatter={(value) => formatXAxis(String(value))}
          />
          <Legend />
          {metricKeys.map((metricKey) => (
            <Line
              key={metricKey}
              type="monotone"
              dataKey={metricKey}
              name={lineNames[metricKey]}
              stroke={lineColors[metricKey]}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
