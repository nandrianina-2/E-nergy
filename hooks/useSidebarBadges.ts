"use client";

import { useState, useEffect, useCallback } from "react";

interface SidebarBadges {
  notifications: number;
  paymentRequests?: number;
  conversations: number;
}

export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>({
    notifications: 0,
    conversations: 0,
  });

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/badges");
      if (res.ok) {
        const data = await res.json();
        setBadges(data);
      }
    } catch {
      // silencieux : les badges ne sont pas critiques, on retentera au prochain cycle
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 20000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return { badges, refetchBadges: fetchBadges };
}
