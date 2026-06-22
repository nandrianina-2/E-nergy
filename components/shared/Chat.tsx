"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Send, Image as ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMessage } from "@/types";
import { Button } from "@/components/ui/Button";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {messages.length === 0 && (
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
                      "flex gap-2 max-w-[80%]",
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
                              className="mt-1 rounded-lg object-cover max-w-full cursor-pointer hover:opacity-90"
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
      <div className="border-t border-[var(--border-color)] p-3 flex items-end gap-2">
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
          placeholder="Écrire un message… (Entrée pour envoyer)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 max-h-32 overflow-y-auto"
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
