"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      // Le service worker n'est volontairement pas enregistré en développement
      // pour éviter les caches qui masquent les changements de code pendant le dev.
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("Échec de l'enregistrement du service worker :", err));
  }, []);

  return null;
}
