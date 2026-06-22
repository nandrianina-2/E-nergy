"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background-muted)] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
        <WifiOff className="h-8 w-8 text-[var(--accent)]" />
      </div>
      <h1 className="mt-6 font-display text-xl font-bold text-[var(--foreground)]">
        Vous êtes hors ligne
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--foreground-muted)]">
        Cette page n'a pas encore été chargée et nécessite une connexion
        internet. Vérifiez votre connexion et réessayez.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-deep)]"
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </button>
    </div>
  );
}
