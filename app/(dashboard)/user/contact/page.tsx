"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ISiteSettings } from "@/types";

interface SiteSettingsResponse {
  settings: ISiteSettings;
}

export default function ContactPage() {
  const { data, isLoading } = useFetch<SiteSettingsResponse>("/api/settings");
  const settings = data?.settings;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Contacter l'administrateur
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Plusieurs façons de nous joindre pour toute question ou assistance
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <>
          <Card className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/30">
            <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Discussion directe
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Le moyen le plus rapide d'obtenir une réponse
                  </p>
                </div>
              </div>
              <Link href="/user/conversations">
                <Button className="w-full sm:w-auto">Ouvrir une discussion</Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {settings?.supportPhone && (
              <Card>
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                    <Phone className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Téléphone
                    </p>
                    <a
                      href={`tel:${settings.supportPhone.replace(/\s/g, "")}`}
                      className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                    >
                      {settings.supportPhone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {settings?.supportEmail && (
              <Card>
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                    <Mail className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--foreground-muted)]">Email</p>
                    <a
                      href={`mailto:${settings.supportEmail}`}
                      className="break-all font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                    >
                      {settings.supportEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {settings?.supportAddress && (
              <Card className="sm:col-span-2">
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                    <MapPin className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Adresse
                    </p>
                    <p className="font-medium text-[var(--foreground)]">
                      {settings.supportAddress}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {!settings?.supportPhone &&
            !settings?.supportEmail &&
            !settings?.supportAddress && (
              <Card>
                <CardContent className="text-center text-sm text-[var(--foreground-muted)]">
                  Aucune information de contact n'a encore été renseignée.
                  Utilisez la discussion directe ci-dessus.
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
