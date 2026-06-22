"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { INotification } from "@/types";
import { useNotificationSound } from "./useNotificationSound";

export function useNotifications() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { play } = useNotificationSound();
  const previousUnreadRef = useRef<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);

        // Joue le son seulement si le compteur augmente par rapport à la dernière
        // valeur connue (et pas lors du tout premier chargement de la page).
        if (
          previousUnreadRef.current !== null &&
          data.unreadCount > previousUnreadRef.current
        ) {
          play();
        }
        previousUnreadRef.current = data.unreadCount;

        setUnreadCount(data.unreadCount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [play]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // rafraîchissement périodique
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllAsRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
