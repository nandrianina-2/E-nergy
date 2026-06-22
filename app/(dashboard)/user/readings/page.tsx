"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { IReading } from "@/types";
import { formatPeriod, formatDate } from "@/lib/utils";

interface ReadingsResponse {
  readings: IReading[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function UserReadingsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useFetch<ReadingsResponse>(
    `/api/readings?page=${page}&limit=12`,
    [page]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Mes relevés
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Historique de vos relevés d'index mensuels
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.readings.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="Aucun relevé"
            description="Vos relevés mensuels apparaîtront ici une fois saisis."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">Période</th>
                    <th className="px-4 py-3 font-medium">Ancien index</th>
                    <th className="px-4 py-3 font-medium">Nouvel index</th>
                    <th className="px-4 py-3 font-medium">Consommation</th>
                    <th className="px-4 py-3 font-medium">Date de saisie</th>
                  </tr>
                </thead>
                <tbody>
                  {data.readings.map((reading) => (
                    <tr
                      key={reading._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {formatPeriod(reading.period)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {reading.oldIndex} kWh
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {reading.newIndex} kWh
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--accent)]">
                        {reading.consumption} kWh
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatDate(reading.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.readings.map((reading) => (
                <div
                  key={reading._id}
                  className="rounded-lg border border-[var(--border-color)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[var(--foreground)]">
                      {formatPeriod(reading.period)}
                    </p>
                    <p className="font-medium text-[var(--accent)]">
                      {reading.consumption} kWh
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {reading.oldIndex} kWh → {reading.newIndex} kWh • Saisi le{" "}
                    {formatDate(reading.submittedAt)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {data && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
