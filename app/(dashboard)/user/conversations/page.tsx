"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, MessageCircle } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createConversationSchema } from "@/lib/validations";
import { IConversation, IInvoice } from "@/types";
import { cn } from "@/lib/utils";
import { useFetch as useInvoicesFetch } from "@/hooks/useFetch";

type ConvForm = z.infer<typeof createConversationSchema>;

interface ConversationsResponse {
  conversations: (IConversation & { unreadCount: number })[];
}

interface InvoicesResponse {
  invoices: IInvoice[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function UserConversationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<ConversationsResponse>(
    "/api/conversations"
  );

  const { data: invoicesData } = useInvoicesFetch<InvoicesResponse>(
    "/api/invoices?limit=50"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvForm>({
    resolver: zodResolver(createConversationSchema),
  });

  async function onSubmit(formData: ConvForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Discussion ouverte");
      setIsModalOpen(false);
      reset();
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
            Mes discussions
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Contactez l'administrateur pour toute question ou preuve de paiement
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle discussion
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Aucune discussion"
            description="Ouvrez une discussion avec l'administrateur pour envoyer une preuve de paiement ou poser une question."
            action={
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle discussion
              </Button>
            }
          />
        ) : (
          <div>
            {data.conversations.map((conv) => {
              const invoice =
                typeof conv.invoiceId === "object" ? conv.invoiceId : null;

              return (
                <Link
                  key={conv._id}
                  href={`/user/conversations/${conv._id}`}
                  className={cn(
                    "flex items-start gap-3 border-b border-[var(--border-color)] p-4 last:border-0 hover:bg-[var(--background-muted)] transition-colors",
                    conv.unreadCount > 0 && "bg-[var(--accent-soft)]/20"
                  )}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                    A
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {conv.subject}
                      </p>
                      <span className="flex-shrink-0 text-xs text-[var(--foreground-muted)]">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    {invoice && (
                      <p className="text-xs text-[var(--accent)] mt-0.5">
                        Facture {(invoice as any).invoiceNumber}
                      </p>
                    )}
                    <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                      Administrateur
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={conv.status === "open" ? "success" : "neutral"}>
                      {conv.status === "open" ? "Ouverte" : "Fermée"}
                    </Badge>
                    {conv.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle discussion"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select label="Facture concernée (optionnel)" {...register("invoiceId")}>
            <option value="">Question générale</option>
            {invoicesData?.invoices.map((inv) => (
              <option key={inv._id} value={inv._id}>
                {inv.invoiceNumber} — {inv.period}
              </option>
            ))}
          </Select>

          <Input
            label="Sujet"
            placeholder="ex: Preuve de paiement MVola, Question sur ma facture…"
            error={errors.subject?.message}
            {...register("subject")}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Ouvrir
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
