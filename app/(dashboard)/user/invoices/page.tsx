"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Receipt, CreditCard, Phone, Smartphone, Banknote, ExternalLink } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { IInvoice, IPaymentMethod } from "@/types";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

interface InvoicesResponse {
  invoices: IInvoice[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface PaymentMethodsResponse {
  paymentMethods: IPaymentMethod[];
}

const operatorColors: Record<string, string> = {
  mvola: "#FFCC00",
  orange_money: "#FF6600",
  airtel_money: "#ED1C24",
};

export default function UserInvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [payingInvoice, setPayingInvoice] = useState<IInvoice | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useFetch<InvoicesResponse>(
    `/api/invoices?page=${page}&status=${statusFilter}`,
    [page, statusFilter]
  );

  const { data: methodsData } = useFetch<PaymentMethodsResponse>(
    "/api/payment-methods"
  );

  const activeMethods = methodsData?.paymentMethods.filter((m) => m.isActive) || [];

  function buildUssdLink(method: IPaymentMethod, amount: number): string {
    const code = method.ussdTemplate
      .replace("{amount}", Math.round(amount).toString())
      .replace("{code}", method.transferCode);
    return `tel:${encodeURIComponent(code)}`;
  }

  async function handleValidatePay() {
    if (!payingInvoice || !selectedMethod) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payingInvoice._id,
          method: selectedMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(
        selectedMethod === "cash"
          ? "Demande enregistrée. L'admin validera votre paiement en espèces."
          : "Demande enregistrée. Envoyez la capture dans la discussion pour accélérer la validation."
      );
      setPayingInvoice(null);
      setSelectedMethod(null);

      // Ouvre automatiquement la discussion si elle n'existe pas encore
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payingInvoice._id,
          subject: `Paiement facture ${payingInvoice.invoiceNumber}`,
          text: `J'ai effectué le paiement de ${formatCurrency(payingInvoice.totalAmount - payingInvoice.amountPaid)} pour la facture ${payingInvoice.invoiceNumber} via ${selectedMethod === "cash" ? "espèces" : selectedMethod}.`,
        }),
      });
      const convJson = await convRes.json();
      if (convRes.ok && convJson.conversation) {
        router.push(`/user/conversations/${convJson.conversation._id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  const remaining = payingInvoice
    ? payingInvoice.totalAmount - payingInvoice.amountPaid
    : 0;

  const selectedMethodObj = activeMethods.find((m) => m.operator === selectedMethod);
  const isMobileMoney =
    selectedMethod && selectedMethod !== "cash" && selectedMethodObj;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Mes factures
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Consultez et payez vos factures d'électricité
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
          <EmptyState icon={Receipt} title="Aucune facture" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">N° Facture</th>
                    <th className="px-4 py-3 font-medium">Période</th>
                    <th className="px-4 py-3 font-medium">Consommation</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Échéance</th>
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
                        <div className="flex justify-end gap-1">
                          {invoice.paymentStatus !== "paid" && (
                            <button
                              onClick={() => {
                                setPayingInvoice(invoice);
                                setSelectedMethod(null);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Payer
                            </button>
                          )}
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
                    <p className="truncate font-mono text-sm text-[var(--foreground)]">
                      {invoice.invoiceNumber}
                    </p>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {formatPeriod(invoice.period)} • {invoice.consumption} kWh
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    Échéance : {formatDate(invoice.dueDate)}
                  </p>

                  <div className="mt-3 flex gap-2 border-t border-[var(--border-color)] pt-3">
                    {invoice.paymentStatus !== "paid" && (
                      <button
                        onClick={() => {
                          setPayingInvoice(invoice);
                          setSelectedMethod(null);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-deep)]"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Payer
                      </button>
                    )}
                    <a
                      href={`/api/invoices/${invoice._id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
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

      {/* Modal de paiement */}
      <Modal
        isOpen={!!payingInvoice}
        onClose={() => {
          setPayingInvoice(null);
          setSelectedMethod(null);
        }}
        title="Payer la facture"
      >
        {payingInvoice && (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg bg-[var(--background-muted)] p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Facture {payingInvoice.invoiceNumber}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                {formatCurrency(remaining)}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">
                Reste à payer
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                Choisir un moyen de paiement
              </p>
              <div className="flex flex-col gap-2">
                {activeMethods.map((method) => (
                  <button
                    key={method.operator}
                    onClick={() => setSelectedMethod(method.operator)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedMethod === method.operator
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border-color)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: operatorColors[method.operator] }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {method.label}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {method.transferCode}
                      </p>
                    </div>
                    <Smartphone className="ml-auto h-4 w-4 text-[var(--foreground-muted)]" />
                  </button>
                ))}

                <button
                  onClick={() => setSelectedMethod("cash")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                    selectedMethod === "cash"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <Banknote className="h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Espèces
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Dépôt en main propre
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Bouton USSD si mobile money sélectionné */}
            {isMobileMoney && selectedMethodObj && (
              <div className="rounded-lg border border-[var(--info)]/30 bg-[var(--info)]/5 p-3">
                <p className="text-sm text-[var(--info)]">
                  Cliquez sur le bouton ci-dessous pour ouvrir le code de transfert
                  directement sur votre téléphone.
                </p>
                <a
                  href={buildUssdLink(selectedMethodObj, remaining)}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--info)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Phone className="h-4 w-4" />
                  Ouvrir {selectedMethodObj.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {selectedMethod === "cash" && (
              <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3">
                <p className="text-sm text-[var(--warning)]">
                  Après avoir effectué votre paiement en espèces, cliquez sur
                  "Valider" pour informer l'administrateur. Votre paiement sera
                  confirmé manuellement.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPayingInvoice(null);
                  setSelectedMethod(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleValidatePay}
                disabled={!selectedMethod}
                isLoading={isSubmitting}
              >
                Valider
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
