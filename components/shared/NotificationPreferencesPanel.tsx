"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NotificationChannelPrefs } from "@/types";

interface PreferencesResponse {
  preferences: Record<string, NotificationChannelPrefs>;
}

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  new_invoice: {
    label: "Nouvelle facture",
    description: "Quand une facture est générée pour votre sous-compteur",
  },
  reading_reminder: {
    label: "Rappel de relevé",
    description: "Rappel mensuel pour saisir votre index",
  },
  payment_overdue: {
    label: "Facture en retard",
    description: "Relance quand une facture dépasse l'échéance",
  },
  payment_received: {
    label: "Paiement validé/rejeté",
    description: "Confirmation après traitement d'un paiement",
  },
  new_message: {
    label: "Nouveaux messages",
    description: "Quand vous recevez un message dans une discussion",
  },
  general: {
    label: "Autres notifications",
    description: "Notifications diverses non classées",
  },
};

const ADMIN_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  payment_overdue: {
    label: "Retards de paiement persistants",
    description: "Alerte après plusieurs relances sans paiement",
  },
  new_message: {
    label: "Nouveaux messages",
    description: "Quand un utilisateur écrit une discussion",
  },
  general: {
    label: "Activité générale",
    description: "Nouveaux relevés, demandes de paiement, discussions ouvertes",
  },
};

const DEFAULT_PREFS: NotificationChannelPrefs = { inApp: true, email: true };

export function NotificationPreferencesPanel({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const { data, isLoading, refetch } = useFetch<PreferencesResponse>(
    "/api/profile/notification-preferences"
  );
  const [prefs, setPrefs] = useState<Record<string, NotificationChannelPrefs>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.preferences) {
      setPrefs(data.preferences);
    }
  }, [data]);

  const typeLabels = isAdmin ? ADMIN_TYPE_LABELS : NOTIFICATION_TYPE_LABELS;

  function getPref(type: string): NotificationChannelPrefs {
    return prefs[type] || DEFAULT_PREFS;
  }

  function updatePref(type: string, channel: "inApp" | "email", value: boolean) {
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...getPref(type), [channel]: value },
    }));
    setHasChanges(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Préférences enregistrées");
      setHasChanges(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--foreground-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Préférences de notification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-[var(--foreground-muted)]">
            Choisissez comment vous souhaitez être informé pour chaque type
            d'événement. La création de compte et les alertes d'écart de
            consommation sont toujours actives, pour des raisons de sécurité.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="px-2 py-2 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5" />
                      In-app
                    </span>
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(typeLabels).map(([type, info]) => {
                  const pref = getPref(type);
                  return (
                    <tr
                      key={type}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[var(--foreground)]">
                          {info.label}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {info.description}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <ToggleSwitch
                          checked={pref.inApp}
                          onChange={(v) => updatePref(type, "inApp", v)}
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <ToggleSwitch
                          checked={pref.email}
                          onChange={(v) => updatePref(type, "email", v)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving} disabled={!hasChanges}>
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
