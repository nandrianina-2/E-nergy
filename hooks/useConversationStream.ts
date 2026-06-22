"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { IMessage } from "@/types";

interface UseConversationStreamOptions {
  conversationId: string;
  onNewMessages: (messages: IMessage[]) => void;
  enabled?: boolean;
}

/**
 * Consomme le flux SSE d'une conversation pour recevoir les nouveaux messages
 * en temps quasi réel (latence ~1.5s), avec reconnexion automatique transparente
 * si la connexion tombe (réseau coupé, fonction serverless recyclée par Vercel, etc.)
 */
export function useConversationStream({
  conversationId,
  onNewMessages,
  enabled = true,
}: UseConversationStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const lastSeenRef = useRef<string>(new Date(0).toISOString());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNewMessagesRef = useRef(onNewMessages);
  onNewMessagesRef.current = onNewMessages;

  const connect = useCallback(() => {
    if (!enabled) return;

    const url = `/api/conversations/${conversationId}/stream?since=${encodeURIComponent(
      lastSeenRef.current
    )}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setIsConnected(true);
    });

    es.addEventListener("messages", (event) => {
      try {
        const data = JSON.parse(event.data) as { messages: IMessage[] };
        if (data.messages.length > 0) {
          lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
          onNewMessagesRef.current(data.messages);
        }
      } catch (err) {
        console.error("[SSE] Erreur de parsing :", err);
      }
    });

    es.addEventListener("reconnect", () => {
      // Le serveur ferme volontairement avant la limite de durée Vercel :
      // on rouvre immédiatement une nouvelle connexion, sans que l'utilisateur le perçoive.
      es.close();
      connect();
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // Reconnexion avec un léger délai pour éviter de marteler le serveur
      // en cas de coupure réseau prolongée.
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, enabled]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, enabled]);

  return { isConnected };
}
