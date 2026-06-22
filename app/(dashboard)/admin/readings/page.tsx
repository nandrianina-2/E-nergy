"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Gauge, Plus } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { createReadingByAdminSchema } from "@/lib/validations";
import { ISubmeter, IReading } from "@/types";
import { formatPeriod, formatDate, getCurrentPeriod } from "@/lib/utils";

type ReadingForm = z.input<typeof createReadingByAdminSchema>;

interface SubmetersResponse {
  submeters: ISubmeter[];
}

interface ReadingsResponse {
  readings: IReading[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function AdminReadingsPage() {
  const [page, setPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: submetersData } = useFetch<SubmetersResponse>(
    "/api/submeters?limit=100"
  );
  const { data, isLoading, refetch } = useFetch<ReadingsResponse>(
    `/api/readings?page=${page}&limit=12`,
    [page]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReadingForm>({
    resolver: zodResolver(createReadingByAdminSchema),
    defaultValues: { period: getCurrentPeriod() },
  });

  const selectedSubmeterId = watch("submeterId");
  const selectedSubmeter = submetersData?.submeters.find(
    (s) => s._id === selectedSubmeterId
  );

  async function onSubmit(formData: ReadingForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Relevé enregistré avec succès");
      reset({ period: getCurrentPeriod() });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Saisie des relevés
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Saisissez un relevé pour le compte d'un utilisateur indisponible
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau relevé</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Select
              label="Sous-compteur"
              error={errors.submeterId?.message}
              {...register("submeterId")}
            >
              <option value="">Sélectionner…</option>
              {submetersData?.submeters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.label} ({s.code})
                </option>
              ))}
            </Select>

            <Input
              label="Période"
              type="month"
              error={errors.period?.message}
              {...register("period")}
            />

            {selectedSubmeter && (
              <div className="sm:col-span-2 rounded-lg bg-[var(--background-muted)] px-3 py-2 text-sm text-[var(--foreground-muted)]">
                Index initial du sous-compteur : {selectedSubmeter.initialIndex} kWh
                (le dernier relevé connu sera utilisé comme référence si disponible)
              </div>
            )}

            <Input
              label="Nouvel index (kWh)"
              type="number"
              step="0.01"
              error={errors.newIndex?.message}
              {...register("newIndex", { valueAsNumber: true })}
            />

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                <Plus className="h-4 w-4" />
                Enregistrer le relevé
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relevés récents (tous sous-compteurs)</CardTitle>
        </CardHeader>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.readings.length === 0 ? (
          <EmptyState icon={Gauge} title="Aucun relevé" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">Sous-compteur</th>
                    <th className="px-4 py-3 font-medium">Période</th>
                    <th className="px-4 py-3 font-medium">Consommation</th>
                    <th className="px-4 py-3 font-medium">Saisi par</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.readings.map((r) => (
                    <tr
                      key={r._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {typeof r.submeterId === "object"
                          ? `${r.submeterId.label} (${r.submeterId.code})`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatPeriod(r.period)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--accent)]">
                        {r.consumption} kWh
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {typeof r.submittedBy === "object" ? r.submittedBy.name : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatDate(r.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.readings.map((r) => (
                <div
                  key={r._id}
                  className="rounded-lg border border-[var(--border-color)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {typeof r.submeterId === "object"
                        ? `${r.submeterId.label} (${r.submeterId.code})`
                        : "—"}
                    </p>
                    <p className="flex-shrink-0 font-medium text-[var(--accent)]">
                      {r.consumption} kWh
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {formatPeriod(r.period)} •{" "}
                    {typeof r.submittedBy === "object" ? r.submittedBy.name : "—"}{" "}
                    • {formatDate(r.submittedAt)}
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
