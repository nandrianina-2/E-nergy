"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatPeriod } from "@/lib/utils";

interface ConsumptionDataPoint {
  period: string;
  submetersTotal: number;
  mainMeterTotal: number | null;
}

export function ConsumptionChart({ data }: { data: ConsumptionDataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatPeriod(d.period),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--foreground-muted)" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--foreground-muted)" }}
          label={{ value: "kWh", angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--background)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line
          type="monotone"
          dataKey="mainMeterTotal"
          name="Compteur principal"
          stroke="#d97706"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="submetersTotal"
          name="Sous-compteurs (total)"
          stroke="#0284c7"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
