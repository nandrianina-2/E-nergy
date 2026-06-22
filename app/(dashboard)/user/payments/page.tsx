"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { IPayment } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PaymentsResponse {
  payments: IPayment[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const methodLabels: Record<string, string> = {
  cash: "Espèces",
  transfer: "Virement",
  mobile_money: "Mobile Money",
  other: "Autre",
};

export default function UserPaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useFetch<PaymentsResponse>(
    `/api/payments?page=${page}`,
    [page]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Mes paiements
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Historique de vos paiements enregistrés
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun paiement enregistré"
            description="Vos paiements apparaîtront ici une fois enregistrés par l'administrateur."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">Facture</th>
                    <th className="px-4 py-3 font-medium">Montant payé</th>
                    <th className="px-4 py-3 font-medium">Méthode</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment) => (
                    <tr
                      key={payment._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                        {typeof payment.invoiceId === "object"
                          ? payment.invoiceId.invoiceNumber
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--success)]">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">
                          {methodLabels[payment.method] || payment.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {payment.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.payments.map((payment) => (
                <div
                  key={payment._id}
                  className="rounded-lg border border-[var(--border-color)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-mono text-sm text-[var(--foreground)]">
                      {typeof payment.invoiceId === "object"
                        ? payment.invoiceId.invoiceNumber
                        : "—"}
                    </p>
                    <p className="font-medium text-[var(--success)]">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="neutral">
                      {methodLabels[payment.method] || payment.method}
                    </Badge>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {formatDate(payment.paymentDate)}
                    </span>
                  </div>
                  {payment.note && (
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                      {payment.note}
                    </p>
                  )}
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
