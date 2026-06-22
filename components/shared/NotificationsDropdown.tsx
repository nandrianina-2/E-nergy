"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "@/hooks/useTranslation";

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

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { t } = useTranslation();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--background)] shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] p-3">
            <p className="font-display text-sm font-semibold text-[var(--foreground)]">
              {t.notifications.title}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t.notifications.markAllRead}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--foreground-muted)]">
                {t.notifications.empty}
              </p>
            ) : (
              notifications.map((n) => {
                const content = (
                  <>
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        typeColors[n.type] || "bg-[var(--foreground-muted)]"
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--foreground-muted)] line-clamp-2">
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </>
                );

                const sharedClassName = cn(
                  "flex w-full gap-3 border-b border-[var(--border-color)] p-3 text-left hover:bg-[var(--background-muted)]",
                  !n.isRead && "bg-[var(--accent-soft)]/30"
                );

                if (n.link) {
                  return (
                    <Link
                      key={n._id}
                      href={n.link}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n._id);
                        setIsOpen(false);
                      }}
                      className={sharedClassName}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={n._id}
                    onClick={() => !n.isRead && markAsRead(n._id)}
                    className={sharedClassName}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
