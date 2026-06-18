"use client";

import { useState } from "react";
import { Download, Receipt } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { IInvoice } from "@/types";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

interface InvoicesResponse {
  invoices: IInvoice[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function UserInvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useFetch<InvoicesResponse>(
    `/api/invoices?page=${page}&status=${statusFilter}`,
    [page, statusFilter]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Mes factures
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Consultez et téléchargez vos factures d'électricité
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
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
          <EmptyState icon={Receipt} title="Aucune facture" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-medium">N° Facture</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium">Consommation</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Échéance</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
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
                      {formatPeriod(invoice.period)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {invoice.consumption} kWh
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/invoices/${invoice._id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
