"use client";

import { NotificationPreferencesPanel } from "@/components/shared/NotificationPreferencesPanel";

export default function UserNotificationSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Paramètres de notification
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Gérez la façon dont vous êtes informé
        </p>
      </div>

      <NotificationPreferencesPanel />
    </div>
  );
}
