"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatPeriod, formatCurrency } from "@/lib/utils";

interface PaymentDataPoint {
  period: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export function PaymentsChart({ data }: { data: PaymentDataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatPeriod(d.period),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--foreground-muted)" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--foreground-muted)" }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: "var(--background)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="paidAmount" name="Payé" fill="#16a34a" radius={[4, 4, 0, 0]} stackId="a" />
        <Bar dataKey="unpaidAmount" name="Impayé" fill="#dc2626" radius={[4, 4, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
