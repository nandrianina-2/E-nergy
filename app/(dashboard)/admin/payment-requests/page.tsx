"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Wallet, Smartphone, Banknote } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { IPaymentRequest } from "@/types";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

interface PaymentRequestsResponse {
  paymentRequests: IPaymentRequest[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const methodLabels: Record<string, string> = {
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  cash: "Espèces",
};

const methodIcons: Record<string, typeof Smartphone> = {
  mvola: Smartphone,
  orange_money: Smartphone,
  airtel_money: Smartphone,
  cash: Banknote,
};

export default function AdminPaymentRequestsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectingRequest, setRejectingRequest] = useState<IPaymentRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useFetch<PaymentRequestsResponse>(
    `/api/payment-requests?page=${page}&status=${statusFilter}`,
    [page, statusFilter]
  );

  async function handleApprove(request: IPaymentRequest) {
    setProcessingId(request._id);
    try {
      const res = await fetch(`/api/payment-requests/${request._id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Paiement validé");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject() {
    if (!rejectingRequest) return;
    setProcessingId(rejectingRequest._id);
    try {
      const res = await fetch(
        `/api/payment-requests/${rejectingRequest._id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: "rejected",
            rejectionReason: rejectionReason || undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Demande rejetée");
      setRejectingRequest(null);
      setRejectionReason("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Demandes de paiement
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Validez ou rejetez les paiements déclarés par les utilisateurs
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
          <option value="pending">En attente</option>
          <option value="approved">Validées</option>
          <option value="rejected">Rejetées</option>
          <option value="">Toutes</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.paymentRequests.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucune demande de paiement"
            description="Les déclarations de paiement des utilisateurs apparaîtront ici."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">Utilisateur</th>
                    <th className="px-4 py-3 font-medium">Facture</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Méthode</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentRequests.map((pr) => {
                    const Icon = methodIcons[pr.method];
                    return (
                      <tr
                        key={pr._id}
                        className="border-b border-[var(--border-color)] last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          {typeof pr.userId === "object" ? pr.userId.name : "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {typeof pr.invoiceId === "object"
                            ? `${pr.invoiceId.invoiceNumber} (${formatPeriod(
                                pr.invoiceId.period
                              )})`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          {formatCurrency(pr.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)]">
                            <Icon className="h-3.5 w-3.5" />
                            {methodLabels[pr.method]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {formatDate(pr.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              pr.status === "approved"
                                ? "success"
                                : pr.status === "rejected"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {pr.status === "approved"
                              ? "Validée"
                              : pr.status === "rejected"
                              ? "Rejetée"
                              : "En attente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {pr.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleApprove(pr)}
                                disabled={processingId === pr._id}
                                className="rounded-lg p-2 text-[var(--success)] hover:bg-[var(--success)]/10"
                                title="Valider"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectingRequest(pr)}
                                disabled={processingId === pr._id}
                                className="rounded-lg p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                                title="Rejeter"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.paymentRequests.map((pr) => {
                const Icon = methodIcons[pr.method];
                return (
                  <div
                    key={pr._id}
                    className="rounded-lg border border-[var(--border-color)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {typeof pr.userId === "object" ? pr.userId.name : "—"}
                        </p>
                        <p className="truncate text-xs text-[var(--foreground-muted)]">
                          {typeof pr.invoiceId === "object"
                            ? `${pr.invoiceId.invoiceNumber} (${formatPeriod(
                                pr.invoiceId.period
                              )})`
                            : "—"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          pr.status === "approved"
                            ? "success"
                            : pr.status === "rejected"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {pr.status === "approved"
                          ? "Validée"
                          : pr.status === "rejected"
                          ? "Rejetée"
                          : "En attente"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)]">
                        <Icon className="h-3.5 w-3.5" />
                        {methodLabels[pr.method]} • {formatDate(pr.createdAt)}
                      </span>
                      <span className="font-medium text-[var(--foreground)]">
                        {formatCurrency(pr.amount)}
                      </span>
                    </div>

                    {pr.status === "pending" && (
                      <div className="mt-3 flex justify-end gap-2 border-t border-[var(--border-color)] pt-3">
                        <button
                          onClick={() => handleApprove(pr)}
                          disabled={processingId === pr._id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Valider
                        </button>
                        <button
                          onClick={() => setRejectingRequest(pr)}
                          disabled={processingId === pr._id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        >
                          <X className="h-3.5 w-3.5" />
                          Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Rejeter la demande de paiement"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            L'utilisateur sera notifié du rejet et pourra vous contacter via la
            discussion liée à sa facture.
          </p>
          <Input
            label="Raison du rejet (optionnel)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="ex: Le montant ne correspond pas"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectingRequest(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={processingId === rejectingRequest?._id}
            >
              Rejeter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
