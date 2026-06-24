"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Archive, ArchiveRestore } from "lucide-react";
import { use } from "react";
import { toast } from "sonner";
import { useFetch } from "@/hooks/useFetch";
import { Chat } from "@/components/shared/Chat";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IConversation, IMessage } from "@/types";
import { formatDate } from "@/lib/utils";

interface MessagesResponse {
  messages: IMessage[];
}

interface ConversationResponse {
  conversation: IConversation;
}

export default function UserConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const { data: convData, isLoading: convLoading, refetch: refetchConv } =
    useFetch<ConversationResponse>(`/api/conversations/${id}`);

  const {
    data: msgData,
    isLoading: msgLoading,
    refetch,
  } = useFetch<MessagesResponse>(`/api/conversations/${id}/messages`);

  useEffect(() => {
    fetch(`/api/conversations/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, [id]);

  const conv = convData?.conversation;
  const messages = msgData?.messages || [];
  const invoice = conv
    ? typeof conv.invoiceId === "object"
      ? conv.invoiceId
      : null
    : null;

  async function toggleArchive() {
    if (!conv) return;
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedByUser: !conv.archivedByUser }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(
        conv.archivedByUser ? "Discussion désarchivée" : "Discussion archivée"
      );
      if (!conv.archivedByUser) {
        router.push("/user/conversations");
      } else {
        refetchConv();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <Link
          href="/user/conversations"
          className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        {conv && (
          <button
            onClick={toggleArchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
          >
            {conv.archivedByUser ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5" />
                Désarchiver
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                Archiver
              </>
            )}
          </button>
        )}
      </div>

      {convLoading ? (
        <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
      ) : conv ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-[var(--foreground)] truncate">
                {conv.subject}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--foreground-muted)] truncate">
                Discussion avec l'administrateur • {formatDate(conv.createdAt)}
              </p>
              {invoice && (
                <p className="text-xs text-[var(--accent)] mt-1">
                  Facture {(invoice as any).invoiceNumber}
                </p>
              )}
            </div>
            <Badge variant={conv.status === "open" ? "success" : "neutral"}>
              {conv.status === "open" ? "Ouverte" : "Fermée"}
            </Badge>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
            {msgLoading ? (
              <p className="p-4 text-sm text-[var(--foreground-muted)]">
                Chargement des messages…
              </p>
            ) : (
              <Chat
                conversationId={id}
                messages={messages}
                onMessageSent={refetch}
              />
            )}
          </Card>

          {conv.status === "closed" && (
            <p className="text-center text-xs sm:text-sm text-[var(--foreground-muted)] flex-shrink-0">
              Cette conversation est fermée. Ouvrez-en une nouvelle si besoin.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--foreground-muted)]">
          Conversation introuvable.
        </p>
      )}
    </div>
  );
}
