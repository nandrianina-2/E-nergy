"use client";

import {
  Gauge,
  Users,
  Zap,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ConsumptionChart } from "@/components/charts/ConsumptionChart";
import { PaymentsChart } from "@/components/charts/PaymentsChart";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DashboardStats } from "@/types";

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
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFetch<DashboardStats>(
    "/api/dashboard"
  );
  const { data: charts, isLoading: chartsLoading } = useFetch<ChartsData>(
    "/api/dashboard/charts?months=6"
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Tableau de bord
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Vue d'ensemble de la consommation et des paiements
        </p>
      </div>

      {!statsLoading && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Sous-compteurs actifs"
              value={`${stats.activeSubmeters} / ${stats.totalSubmeters}`}
              icon={Gauge}
            />
            <StatCard
              label="Utilisateurs"
              value={formatNumber(stats.totalUsers)}
              icon={Users}
            />
            <StatCard
              label="Consommation du mois"
              value={`${formatNumber(stats.currentPeriodConsumption)} kWh`}
              icon={Zap}
            />
            <StatCard
              label="Montant impayé"
              value={formatCurrency(stats.unpaidAmount)}
              icon={Wallet}
              trend={
                stats.unpaidInvoicesCount > 0
                  ? {
                      value: `${stats.unpaidInvoicesCount} facture(s) en attente`,
                      positive: false,
                    }
                  : undefined
              }
            />
          </div>

          {stats.discrepancy && (
            <Card
              className={
                stats.discrepancy.isWithinTolerance
                  ? "border-[var(--success)]/30"
                  : "border-[var(--danger)]/30"
              }
            >
              <CardContent className="flex items-start gap-3">
                {stats.discrepancy.isWithinTolerance ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]" />
                )}
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {stats.discrepancy.isWithinTolerance
                      ? "Écart de consommation dans la tolérance"
                      : "Écart de consommation anormal détecté"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                    Compteur principal :{" "}
                    {formatNumber(stats.discrepancy.mainMeterConsumption)} kWh
                    — Somme des sous-compteurs :{" "}
                    {formatNumber(stats.discrepancy.submetersTotalConsumption)}{" "}
                    kWh ({stats.discrepancy.differencePercent.toFixed(1)}%
                    d'écart)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consommation (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoading && charts ? (
              <ConsumptionChart data={charts.consumptionByPeriod} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-[var(--foreground-muted)]">
                Chargement…
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiements (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoading && charts ? (
              <PaymentsChart data={charts.paymentsByPeriod} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-[var(--foreground-muted)]">
                Chargement…
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
