"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, MessageCircle, MoreVertical, Lock, LockOpen, Trash2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { createConversationSchema } from "@/lib/validations";
import { IConversation, IUser } from "@/types";
import { cn } from "@/lib/utils";

type ConvForm = z.infer<typeof createConversationSchema>;

interface ConversationsResponse {
  conversations: (IConversation & { unreadCount: number })[];
}

interface UsersResponse {
  users: IUser[];
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

export default function AdminConversationsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState<IConversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, refetch } = useFetch<ConversationsResponse>(
    "/api/conversations"
  );

  const { data: usersData } = useFetch<UsersResponse>(
    "/api/users?limit=200&role=user"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvForm>({
    resolver: zodResolver(createConversationSchema),
  });

  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  function openModal() {
    reset({ subject: "", text: "" });
    setIsModalOpen(true);
  }

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

      toast.success("Discussion créée");
      setIsModalOpen(false);
      reset();
      refetch();
      router.push(`/admin/conversations/${json.conversation._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(conv: IConversation, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      const newStatus = conv.status === "open" ? "closed" : "open";
      const res = await fetch(`/api/conversations/${conv._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(newStatus === "closed" ? "Discussion fermée" : "Discussion réouverte");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function handleDelete() {
    if (!deletingConv) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${deletingConv._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Discussion supprimée définitivement");
      setDeletingConv(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Discussions
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Toutes les conversations avec les utilisateurs
          </p>
        </div>
        <Button onClick={openModal}>
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
            description="Démarrez une discussion avec un utilisateur ou attendez qu'il vous contacte."
            action={
              <Button size="sm" onClick={openModal}>
                <Plus className="h-4 w-4" />
                Nouvelle discussion
              </Button>
            }
          />
        ) : (
          <div>
            {data.conversations.map((conv) => {
              const user = typeof conv.userId === "object" ? conv.userId : null;
              const invoice =
                typeof conv.invoiceId === "object" ? conv.invoiceId : null;

              return (
                <Link
                  key={conv._id}
                  href={`/admin/conversations/${conv._id}`}
                  className={cn(
                    "relative flex items-start gap-3 border-b border-[var(--border-color)] p-4 last:border-0 hover:bg-[var(--background-muted)] transition-colors",
                    conv.unreadCount > 0 && "bg-[var(--accent-soft)]/20"
                  )}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center font-bold text-[var(--accent)] overflow-hidden">
                    {(user as any)?.avatarUrl ? (
                      <Image
                        src={(user as any).avatarUrl}
                        alt={(user as any).name || ""}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      (user as any)?.name?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {(user as any)?.name || "Utilisateur inconnu"}
                      </p>
                      <span className="flex-shrink-0 text-xs text-[var(--foreground-muted)]">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground-muted)] truncate">
                      {conv.subject}
                    </p>
                    {invoice && (
                      <p className="text-xs text-[var(--accent)] mt-0.5">
                        Facture {(invoice as any).invoiceNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Badge variant={conv.status === "open" ? "success" : "neutral"}>
                        {conv.status === "open" ? "Ouverte" : "Fermée"}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === conv._id ? null : conv._id);
                        }}
                        className="rounded-lg p-1 text-[var(--foreground-muted)] hover:bg-[var(--border-color)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {openMenuId === conv._id && (
                    <div
                      className="absolute right-4 top-12 z-10 w-48 rounded-lg border border-[var(--border-color)] bg-[var(--background)] py-1 shadow-lg"
                      onClick={(e) => e.preventDefault()}
                    >
                      <button
                        onClick={(e) => toggleStatus(conv, e)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
                      >
                        {conv.status === "open" ? (
                          <>
                            <Lock className="h-4 w-4" />
                            Fermer la discussion
                          </>
                        ) : (
                          <>
                            <LockOpen className="h-4 w-4" />
                            Réouvrir la discussion
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setDeletingConv(conv);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer définitivement
                      </button>
                    </div>
                  )}
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
          <Select
            label="Utilisateur destinataire"
            error={errors.userId?.message}
            {...register("userId")}
          >
            <option value="">Sélectionner un utilisateur…</option>
            {usersData?.users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>

          <Input
            label="Sujet"
            placeholder="ex: Rappel de paiement, Question sur votre relevé…"
            error={errors.subject?.message}
            {...register("subject")}
          />

          <Input
            label="Premier message (optionnel)"
            placeholder="ex: Bonjour, votre facture de janvier est en retard…"
            error={errors.text?.message}
            {...register("text")}
          />

          <p className="text-xs text-[var(--foreground-muted)]">
            L'utilisateur sera notifié par notification et par email.
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingConv}
        onClose={() => setDeletingConv(null)}
        title="Supprimer la discussion"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            Cette action supprimera définitivement la discussion{" "}
            <strong className="text-[var(--foreground)]">
              {deletingConv?.subject}
            </strong>{" "}
            et tous ses messages. Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingConv(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
