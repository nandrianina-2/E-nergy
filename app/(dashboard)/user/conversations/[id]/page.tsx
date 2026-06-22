"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { use } from "react";
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

  const { data: convData, isLoading: convLoading } =
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

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/user/conversations"
          className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
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
