"use client";

import { useRef, useCallback, useEffect } from "react";
import { usePreferencesStore } from "@/lib/store/preferences";

export function useNotificationSound() {
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.wav");
    audioRef.current.volume = 0.5;
  }, []);

  const play = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    // Anti-spam : pas plus d'un son toutes les 1.5s, même si plusieurs
    // messages arrivent d'un coup (ex: rattrapage après reconnexion SSE).
    const now = Date.now();
    if (now - lastPlayedRef.current < 1500) return;
    lastPlayedRef.current = now;

    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .catch(() => {
        // Lecture bloquée par le navigateur (pas encore d'interaction utilisateur
        // sur la page) : on ignore silencieusement, ce n'est pas critique.
      });
  }, [soundEnabled]);

  return { play };
}
