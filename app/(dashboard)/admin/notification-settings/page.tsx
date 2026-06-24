"use client";

import { NotificationPreferencesPanel } from "@/components/shared/NotificationPreferencesPanel";

export default function AdminNotificationSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Paramètres de notification
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Gérez la façon dont vous êtes informé en tant qu'administrateur
        </p>
      </div>

      <NotificationPreferencesPanel isAdmin />
    </div>
  );
}
