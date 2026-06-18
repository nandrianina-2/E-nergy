"use client";

import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD} j`;
}

const typeColors: Record<string, string> = {
  new_invoice: "bg-[var(--info)]",
  reading_reminder: "bg-[var(--warning)]",
  payment_overdue: "bg-[var(--danger)]",
  payment_received: "bg-[var(--success)]",
  discrepancy_alert: "bg-[var(--danger)]",
  account_created: "bg-[var(--accent)]",
  general: "bg-[var(--foreground-muted)]",
};

export default function AdminNotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Notifications
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            {unreadCount > 0
              ? `${unreadCount} notification(s) non lue(s)`
              : "Toutes les notifications sont lues"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Aucune notification" />
        ) : (
          <div>
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.isRead && markAsRead(n._id)}
                className={cn(
                  "flex w-full gap-3 border-b border-[var(--border-color)] p-4 text-left last:border-0 hover:bg-[var(--background-muted)]",
                  !n.isRead && "bg-[var(--accent-soft)]/30"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    typeColors[n.type] || "bg-[var(--foreground-muted)]"
                  )}
                />
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">{n.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
