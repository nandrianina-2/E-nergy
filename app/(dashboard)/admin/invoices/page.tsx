"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Download, Wallet, Receipt, MessageCircle } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { recordPaymentSchema } from "@/lib/validations";
import { IInvoice } from "@/types";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

type PaymentForm = z.input<typeof recordPaymentSchema>;

interface InvoicesResponse {
  invoices: IInvoice[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<IInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState<string | null>(null);

  const { data, isLoading, refetch } = useFetch<InvoicesResponse>(
    `/api/invoices?page=${page}&status=${statusFilter}`,
    [page, statusFilter]
  );

  async function handleOpenConversation(invoice: IInvoice) {
    setIsOpeningChat(invoice._id);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice._id,
          subject: `Facture ${invoice.invoiceNumber}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/admin/conversations/${json.conversation._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'ouvrir la discussion");
    } finally {
      setIsOpeningChat(null);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
  });

  function openPaymentModal(invoice: IInvoice) {
    setPaymentModalInvoice(invoice);
    reset({
      invoiceId: invoice._id,
      amount: invoice.totalAmount - invoice.amountPaid,
      method: "cash",
    });
  }

  async function onSubmitPayment(formData: PaymentForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Paiement enregistré avec succès");
      setPaymentModalInvoice(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Factures
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Consultez et gérez les factures des sous-compteurs
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
        >
          <option value="">Tous les statuts</option>
          <option value="unpaid">Non payé</option>
          <option value="partial">Partiellement payé</option>
          <option value="paid">Payé</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture"
            description="Les factures apparaîtront ici après génération depuis le compteur principal."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">N° Facture</th>
                    <th className="px-4 py-3 font-medium">Sous-compteur</th>
                    <th className="px-4 py-3 font-medium">Période</th>
                    <th className="px-4 py-3 font-medium">Consommation</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {typeof invoice.submeterId === "object"
                          ? `${invoice.submeterId.label} (${invoice.submeterId.code})`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatPeriod(invoice.period)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {invoice.consumption} kWh
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={invoice.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {invoice.paymentStatus !== "paid" && (
                            <button
                              onClick={() => openPaymentModal(invoice)}
                              className="rounded-lg p-2 text-[var(--success)] hover:bg-[var(--success)]/10"
                              title="Enregistrer un paiement"
                            >
                              <Wallet className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenConversation(invoice)}
                            disabled={isOpeningChat === invoice._id}
                            className="rounded-lg p-2 text-[var(--info)] hover:bg-[var(--info)]/10"
                            title="Discuter de cette facture"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <a
                            href={`/api/invoices/${invoice._id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
                            title="Télécharger le PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="rounded-lg border border-[var(--border-color)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-[var(--foreground)]">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="truncate text-xs text-[var(--foreground-muted)]">
                        {typeof invoice.submeterId === "object"
                          ? `${invoice.submeterId.label} (${invoice.submeterId.code})`
                          : "—"}
                      </p>
                    </div>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {formatPeriod(invoice.period)} • {invoice.consumption} kWh
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end gap-2 border-t border-[var(--border-color)] pt-3">
                    {invoice.paymentStatus !== "paid" && (
                      <button
                        onClick={() => openPaymentModal(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/10"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Paiement
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenConversation(invoice)}
                      disabled={isOpeningChat === invoice._id}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--info)] hover:bg-[var(--info)]/10"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Discuter
                    </button>
                    <a
                      href={`/api/invoices/${invoice._id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  </div>
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

      <Modal
        isOpen={!!paymentModalInvoice}
        onClose={() => setPaymentModalInvoice(null)}
        title="Enregistrer un paiement"
      >
        {paymentModalInvoice && (
          <form onSubmit={handleSubmit(onSubmitPayment)} className="flex flex-col gap-4">
            <div className="rounded-lg bg-[var(--background-muted)] p-3 text-sm">
              <p>
                Facture <strong>{paymentModalInvoice.invoiceNumber}</strong>
              </p>
              <p className="text-[var(--foreground-muted)]">
                Reste à payer :{" "}
                <strong className="text-[var(--foreground)]">
                  {formatCurrency(
                    paymentModalInvoice.totalAmount - paymentModalInvoice.amountPaid
                  )}
                </strong>
              </p>
            </div>

            <input type="hidden" {...register("invoiceId")} />

            <Input
              label="Montant payé"
              type="number"
              step="0.01"
              error={errors.amount?.message}
              {...register("amount", { valueAsNumber: true })}
            />

            <Select label="Méthode de paiement" {...register("method")}>
              <option value="cash">Espèces</option>
              <option value="transfer">Virement</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Autre</option>
            </Select>

            <Input label="Note (optionnel)" {...register("note")} />

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModalInvoice(null)}
              >
                Annuler
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
