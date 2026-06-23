"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Gauge, AlertTriangle, PlayCircle, Info, MessageCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface CronResult {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  period?: string;
  submetersChecked?: number;
  invoicesChecked?: number;
  checked?: number;
  recipientsNotified?: number;
  remindersSent?: number;
  errors?: string[];
}

export default function AdminAutomationsPage() {
  const [isRunningReadings, setIsRunningReadings] = useState(false);
  const [isRunningOverdue, setIsRunningOverdue] = useState(false);
  const [isRunningUnread, setIsRunningUnread] = useState(false);
  const [readingsResult, setReadingsResult] = useState<CronResult | null>(null);
  const [overdueResult, setOverdueResult] = useState<CronResult | null>(null);
  const [unreadResult, setUnreadResult] = useState<CronResult | null>(null);

  async function runReadingReminders(force: boolean) {
    setIsRunningReadings(true);
    setReadingsResult(null);
    try {
      const res = await fetch(
        `/api/cron/reading-reminders${force ? "?force=true" : ""}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'exécution");
      setReadingsResult(json);
      if (json.skipped) {
        toast.info(json.reason);
      } else {
        toast.success(`${json.remindersSent} rappel(s) envoyé(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsRunningReadings(false);
    }
  }

  async function runPaymentOverdue() {
    setIsRunningOverdue(true);
    setOverdueResult(null);
    try {
      const res = await fetch("/api/cron/payment-overdue");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'exécution");
      setOverdueResult(json);
      toast.success(`${json.remindersSent} relance(s) envoyée(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsRunningOverdue(false);
    }
  }

  async function runUnreadMessages() {
    setIsRunningUnread(true);
    setUnreadResult(null);
    try {
      const res = await fetch("/api/cron/unread-messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'exécution");
      setUnreadResult(json);
      toast.success(`${json.recipientsNotified || 0} destinataire(s) notifié(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsRunningUnread(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Automatisations
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Rappels et relances automatiques programmés (cron quotidien)
        </p>
      </div>

      <Card className="border-[var(--info)]/30 bg-[var(--info)]/5">
        <CardContent className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--info)]" />
          <p className="text-sm text-[var(--foreground-muted)]">
            Les rappels de relevé et de paiement s'exécutent via Vercel Cron
            (05h00 et 05h30 UTC, une fois par jour). Le rappel de messages non
            lus nécessite un appel plus fréquent (toutes les 30-60 min) : il
            est déclenché par un service externe gratuit comme{" "}
            <a
              href="https://cron-job.org"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--info)] underline"
            >
              cron-job.org
            </a>{" "}
            (voir le README pour la configuration). Vous pouvez aussi déclencher
            chaque tâche manuellement ci-dessous pour la tester.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Rappel de saisie de relevé
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            Se déclenche automatiquement à partir du 25 de chaque mois pour les
            sous-compteurs n'ayant pas encore saisi leur relevé.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => runReadingReminders(false)}
              isLoading={isRunningReadings}
            >
              <PlayCircle className="h-4 w-4" />
              Exécuter (respecte la date du 25)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runReadingReminders(true)}
              isLoading={isRunningReadings}
            >
              Forcer l'exécution (test)
            </Button>
          </div>

          {readingsResult && (
            <div className="rounded-lg bg-[var(--background-muted)] p-3 text-sm">
              {readingsResult.skipped ? (
                <p className="text-[var(--foreground-muted)]">
                  <Badge variant="neutral">Ignoré</Badge> {readingsResult.reason}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p>
                    <Badge variant="success">Terminé</Badge>{" "}
                    {readingsResult.remindersSent} rappel(s) envoyé(s) sur{" "}
                    {readingsResult.submetersChecked} sous-compteur(s) vérifié(s)
                  </p>
                  {readingsResult.errors && readingsResult.errors.length > 0 && (
                    <p className="text-[var(--danger)]">
                      {readingsResult.errors.length} erreur(s) :{" "}
                      {readingsResult.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Relance des factures en retard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            Relance chaque facture en retard une fois par semaine maximum.
            Au-delà de 3 relances, l'administrateur est aussi notifié d'un
            retard persistant.
          </p>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={runPaymentOverdue}
              isLoading={isRunningOverdue}
            >
              <PlayCircle className="h-4 w-4" />
              Exécuter maintenant
            </Button>
          </div>

          {overdueResult && (
            <div className="rounded-lg bg-[var(--background-muted)] p-3 text-sm">
              <div className="flex flex-col gap-1">
                <p>
                  <Badge variant="success">Terminé</Badge>{" "}
                  {overdueResult.remindersSent} relance(s) envoyée(s) sur{" "}
                  {overdueResult.invoicesChecked} facture(s) en retard vérifiée(s)
                </p>
                {overdueResult.errors && overdueResult.errors.length > 0 && (
                  <p className="text-[var(--danger)]">
                    {overdueResult.errors.length} erreur(s) :{" "}
                    {overdueResult.errors.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Rappel de messages non lus
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            Envoie un email récapitulatif (un seul par destinataire, même avec
            plusieurs messages en attente) pour tout message resté non lu
            depuis plus de 2 heures. Chaque message n'est relancé qu'une fois.
          </p>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={runUnreadMessages}
              isLoading={isRunningUnread}
            >
              <PlayCircle className="h-4 w-4" />
              Exécuter maintenant
            </Button>
          </div>

          {unreadResult && (
            <div className="rounded-lg bg-[var(--background-muted)] p-3 text-sm">
              <div className="flex flex-col gap-1">
                <p>
                  <Badge variant="success">Terminé</Badge>{" "}
                  {unreadResult.recipientsNotified || 0} destinataire(s)
                  notifié(s) pour {unreadResult.checked || 0} message(s) en
                  attente
                </p>
                {unreadResult.errors && unreadResult.errors.length > 0 && (
                  <p className="text-[var(--danger)]">
                    {unreadResult.errors.length} erreur(s) :{" "}
                    {unreadResult.errors.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Planification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="py-2 font-medium">Tâche</th>
                  <th className="py-2 font-medium">Fréquence</th>
                  <th className="py-2 font-medium">Déclencheur</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-2 text-[var(--foreground)]">
                    Rappel de relevé
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    Quotidien (actif à partir du 25), 05:00 UTC
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    Vercel Cron
                  </td>
                </tr>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-2 text-[var(--foreground)]">
                    Relance impayés
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    Quotidien, 05:30 UTC (relance effective 1×/semaine)
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    Vercel Cron
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[var(--foreground)]">
                    Messages non lus
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    Toutes les 30-60 min (relance après 2h sans lecture)
                  </td>
                  <td className="py-2 text-[var(--foreground-muted)]">
                    cron-job.org (externe)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
