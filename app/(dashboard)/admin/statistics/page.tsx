"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ConsumptionChart } from "@/components/charts/ConsumptionChart";
import { PaymentsChart } from "@/components/charts/PaymentsChart";

interface ChartsData {
  consumptionByPeriod: {
    period: string;
    submetersTotal: number;
    mainMeterTotal: number | null;
  }[];
  paymentsByPeriod: {
    period: string;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  }[];
  paymentStatusBreakdown: { _id: string; count: number }[];
}

const statusLabels: Record<string, string> = {
  unpaid: "Non payé",
  partial: "Partiellement payé",
  paid: "Payé",
};

const statusColors: Record<string, string> = {
  unpaid: "#dc2626",
  partial: "#d97706",
  paid: "#16a34a",
};

export default function AdminStatisticsPage() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useFetch<ChartsData>(
    `/api/dashboard/charts?months=${months}`,
    [months]
  );

  const pieData = (data?.paymentStatusBreakdown || []).map((item) => ({
    name: statusLabels[item._id] || item._id,
    value: item.count,
    color: statusColors[item._id] || "#94a3b8",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Statistiques
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Analyse de la consommation et des paiements dans le temps
          </p>
        </div>
        <Select
          value={months}
          onChange={(e) => setMonths(parseInt(e.target.value))}
          className="w-44"
        >
          <option value={3}>3 derniers mois</option>
          <option value={6}>6 derniers mois</option>
          <option value={12}>12 derniers mois</option>
        </Select>
      </div>

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
          Chargement…
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Consommation : compteur principal vs sous-compteurs</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsumptionChart data={data.consumptionByPeriod} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution des paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentsChart data={data.paymentsByPeriod} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des statuts</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[var(--foreground-muted)]">
                    Aucune donnée
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
