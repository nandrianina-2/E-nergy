"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Zap, CheckCircle2, Clock, Wallet, Gauge } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { createReadingSchema } from "@/lib/validations";
import { ISubmeter, IReading, IInvoice } from "@/types";
import { formatCurrency, formatPeriod, getCurrentPeriod } from "@/lib/utils";

type ReadingForm = z.infer<typeof createReadingSchema>;

interface UserDashboardData {
  submeter: ISubmeter;
  currentPeriod: string;
  hasSubmittedCurrentReading: boolean;
  currentReading: IReading | null;
  last6Readings: IReading[];
  recentInvoices: IInvoice[];
  unpaidInvoicesCount: number;
  unpaidAmount: number;
}

export default function UserDashboardPage() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<UserDashboardData>(
    "/api/dashboard/user"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReadingForm>({
    resolver: zodResolver(createReadingSchema),
  });

  function openModal() {
    reset({
      submeterId: data?.submeter._id,
      period: getCurrentPeriod(),
      newIndex: undefined,
    });
    setIsModalOpen(true);
  }

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
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
        Chargement…
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <p className="text-center text-sm text-[var(--foreground-muted)]">
            Aucun sous-compteur n'est associé à votre compte. Contactez
            l'administrateur.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Bonjour {session?.user?.name}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Sous-compteur {data.submeter.label} ({data.submeter.code})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={`Consommation ${formatPeriod(data.currentPeriod)}`}
          value={
            data.currentReading
              ? `${data.currentReading.consumption} kWh`
              : "—"
          }
          icon={Zap}
        />
        <StatCard
          label="Factures impayées"
          value={data.unpaidInvoicesCount}
          icon={Wallet}
        />
        <StatCard
          label="Montant impayé"
          value={formatCurrency(data.unpaidAmount)}
          icon={Gauge}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            {data.hasSubmittedCurrentReading ? (
              <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
            ) : (
              <Clock className="h-8 w-8 text-[var(--warning)]" />
            )}
            <div>
              <p className="font-display font-semibold text-[var(--foreground)]">
                {data.hasSubmittedCurrentReading
                  ? "Relevé déjà soumis ce mois-ci"
                  : "Relevé non soumis pour ce mois"}
              </p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Période en cours : {formatPeriod(data.currentPeriod)}
              </p>
            </div>
          </div>
          {!data.hasSubmittedCurrentReading && (
            <Button onClick={openModal}>Saisir mon relevé</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures récentes</CardTitle>
        </CardHeader>
        {data.recentInvoices.length === 0 ? (
          <CardContent>
            <p className="text-sm text-[var(--foreground-muted)]">
              Aucune facture pour le moment.
            </p>
          </CardContent>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {data.recentInvoices.map((invoice) => (
              <div
                key={invoice._id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {formatPeriod(invoice.period)}
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
                <PaymentStatusBadge status={invoice.paymentStatus} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Saisir mon relevé mensuel"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input type="hidden" {...register("submeterId")} />
          <input type="hidden" {...register("period")} />

          <div className="rounded-lg bg-[var(--background-muted)] p-3 text-sm">
            <p>
              Période : <strong>{formatPeriod(getCurrentPeriod())}</strong>
            </p>
            <p className="text-[var(--foreground-muted)]">
              Le dernier index connu sera utilisé comme référence.
            </p>
          </div>

          <Input
            label="Nouvel index (kWh)"
            type="number"
            step="0.01"
            error={errors.newIndex?.message}
            {...register("newIndex", { valueAsNumber: true })}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Soumettre
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
