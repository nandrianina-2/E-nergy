"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Send, Image as ImageIcon, Loader2, X, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMessage } from "@/types";
import { Button } from "@/components/ui/Button";
import { useConversationStream } from "@/hooks/useConversationStream";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface ChatProps {
  conversationId: string;
  messages: IMessage[];
  onMessageSent: () => void;
}

function timeStr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function Chat({ conversationId, messages, onMessageSent }: ChatProps) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [liveMessages, setLiveMessages] = useState<IMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Réinitialise les messages temps réel quand la liste de base (rechargée depuis l'API) change,
  // pour éviter d'accumuler des doublons après un refetch complet.
  useEffect(() => {
    setLiveMessages([]);
  }, [conversationId, messages.length]);

  const { play: playNotificationSound } = useNotificationSound();

  const { isConnected } = useConversationStream({
    conversationId,
    onNewMessages: (newMsgs) => {
      setLiveMessages((prev) => {
        const knownIds = new Set([...messages, ...prev].map((m) => m._id));
        const fresh = newMsgs.filter((m) => !knownIds.has(m._id));
        if (fresh.length === 0) return prev;

        // Joue le son uniquement si au moins un des nouveaux messages
        // vient de l'autre partie (pas pour ses propres messages confirmés par SSE).
        const hasMessageFromOther = fresh.some((m) => {
          const senderId =
            typeof m.senderId === "object" ? m.senderId._id : m.senderId;
          return senderId !== session?.user?.id;
        });
        if (hasMessageFromOther) playNotificationSound();

        return [...prev, ...fresh];
      });
    },
  });

  // Fusion des messages chargés via l'API et de ceux reçus en direct via SSE,
  // dédoublonnés et triés chronologiquement.
  const allMessages = useMemo(() => {
    const byId = new Map<string, IMessage>();
    for (const m of messages) byId.set(m._id, m);
    for (const m of liveMessages) byId.set(m._id, m);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, liveMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;

    const sigRes = await fetch("/api/upload/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "e-nergy/chat" }),
    });
    const sigData = await sigRes.json();
    if (!sigRes.ok) throw new Error("Impossible de préparer l'upload");

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("timestamp", sigData.timestamp.toString());
    formData.append("signature", sigData.signature);
    formData.append("api_key", sigData.apiKey);
    formData.append("folder", sigData.folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok) throw new Error("Échec de l'upload de l'image");

    return uploadJson.secure_url as string;
  }

  async function handleSend() {
    if (!text.trim() && !imageFile) return;

    setIsSending(true);
    setIsUploading(!!imageFile);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
        setIsUploading(false);
      }

      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim() || undefined,
            imageUrl: imageUrl || undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setText("");
      setImagePreview(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onMessageSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  }

  // Regrouper les messages par date
  const grouped: { date: string; messages: IMessage[] }[] = [];
  for (const msg of allMessages) {
    const d = new Date(msg.createdAt).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Indicateur de connexion temps réel, discret */}
      <div className="flex items-center justify-end gap-1.5 px-3 pt-2 text-xs text-[var(--foreground-muted)]">
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3 text-[var(--success)]" />
            <span className="hidden sm:inline">En direct</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span className="hidden sm:inline">Connexion…</span>
          </>
        )}
      </div>

      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-4 min-h-0">
        {allMessages.length === 0 && (
          <p className="text-center text-sm text-[var(--foreground-muted)] py-8">
            Aucun message. Soyez le premier à écrire.
          </p>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 border-t border-[var(--border-color)]" />
              <span className="text-xs text-[var(--foreground-muted)]">
                {dateLabel(group.messages[0].createdAt)}
              </span>
              <div className="flex-1 border-t border-[var(--border-color)]" />
            </div>

            <div className="flex flex-col gap-2">
              {group.messages.map((msg) => {
                const isMe = typeof msg.senderId === "object"
                  ? msg.senderId._id === session?.user?.id
                  : msg.senderId === session?.user?.id;

                const senderName = typeof msg.senderId === "object"
                  ? msg.senderId.name
                  : "Inconnu";

                const avatarUrl = typeof msg.senderId === "object"
                  ? (msg.senderId as any).avatarUrl
                  : null;

                return (
                  <div
                    key={msg._id}
                    className={cn(
                      "flex gap-2 max-w-[88%] sm:max-w-[75%]",
                      isMe ? "self-end flex-row-reverse" : "self-start flex-row"
                    )}
                  >
                    {!isMe && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full overflow-hidden bg-[var(--accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--accent)] mt-1">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt={senderName || ""} width={28} height={28} className="object-cover" />
                        ) : (
                          senderName?.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      {!isMe && (
                        <span className="text-xs text-[var(--foreground-muted)] ml-1">
                          {senderName}
                        </span>
                      )}

                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm",
                          isMe
                            ? "bg-[var(--accent)] text-white rounded-tr-none"
                            : "bg-[var(--background-muted)] text-[var(--foreground)] rounded-tl-none"
                        )}
                      >
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                        {msg.imageUrl && (
                          <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                            <Image
                              src={msg.imageUrl}
                              alt="Image envoyée"
                              width={240}
                              height={180}
                              className="mt-1 rounded-lg object-cover w-full max-w-[200px] sm:max-w-[240px] h-auto cursor-pointer hover:opacity-90"
                            />
                          </a>
                        )}
                      </div>

                      <span
                        className={cn(
                          "text-xs text-[var(--foreground-muted)]",
                          isMe ? "text-right" : "text-left"
                        )}
                      >
                        {timeStr(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Preview de l'image en attente d'envoi */}
      {imagePreview && (
        <div className="border-t border-[var(--border-color)] px-4 py-2">
          <div className="relative inline-block">
            <Image
              src={imagePreview}
              alt="Aperçu"
              width={100}
              height={75}
              className="rounded-lg object-cover"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="border-t border-[var(--border-color)] p-2 sm:p-3 flex items-end gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-lg p-2 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
          title="Joindre une image"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Écrire un message…"
          rows={1}
          className="flex-1 min-w-0 resize-none rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 max-h-32 overflow-y-auto"
        />

        <Button
          onClick={handleSend}
          disabled={(!text.trim() && !imageFile) || isSending}
          isLoading={isSending}
          size="sm"
          className="flex-shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
