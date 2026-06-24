"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Gauge,
  FileText,
  Receipt,
  BarChart3,
  Bell,
  Wallet,
  UserCircle,
  Zap,
  X,
  BadgeCheck,
  MessageCircle,
  Settings,
  Workflow,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";

const adminLinks = [
  { href: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "users", icon: Users },
  { href: "/admin/submeters", labelKey: "submeters", icon: Gauge },
  { href: "/admin/readings", labelKey: "adminReadings", icon: Gauge },
  { href: "/admin/main-meter", labelKey: "mainMeter", icon: FileText },
  { href: "/admin/invoices", labelKey: "invoices", icon: Receipt },
  {
    href: "/admin/payment-requests",
    labelKey: "paymentRequests",
    icon: BadgeCheck,
    badgeKey: "paymentRequests" as const,
  },
  {
    href: "/admin/conversations",
    labelKey: "conversations",
    icon: MessageCircle,
    badgeKey: "conversations" as const,
  },
  { href: "/admin/statistics", labelKey: "statistics", icon: BarChart3 },
  { href: "/admin/automations", labelKey: "automations", icon: Workflow },
  {
    href: "/admin/notifications",
    labelKey: "notifications",
    icon: Bell,
    badgeKey: "notifications" as const,
  },
  { href: "/admin/notification-settings", labelKey: "notificationSettings", icon: Bell },
  { href: "/admin/settings", labelKey: "settings", icon: Settings },
];

const userLinks = [
  { href: "/user/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/user/readings", labelKey: "readings", icon: Gauge },
  { href: "/user/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/user/payments", labelKey: "payments", icon: Wallet },
  {
    href: "/user/conversations",
    labelKey: "conversations",
    icon: MessageCircle,
    badgeKey: "conversations" as const,
  },
  { href: "/user/profile", labelKey: "profile", icon: UserCircle },
  { href: "/user/contact", labelKey: "contact", icon: Phone },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { siteName, logoUrl } = useSiteSettings();
  const { badges } = useSidebarBadges();

  const links = session?.user?.role === "admin" ? adminLinks : userLinks;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border-color)] bg-[var(--background)] transition-transform md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={36}
                height={36}
                className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
                <Zap className="h-5 w-5 text-white" fill="white" />
              </div>
            )}
            <span className="truncate font-display text-lg font-bold text-[var(--foreground)]">
              {siteName}
            </span>
          </Link>
          <button onClick={onClose} className="md:hidden" aria-label="Fermer le menu">
            <X className="h-5 w-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname?.startsWith(link.href);
              const label =
                (t.nav as Record<string, string>)[link.labelKey] ||
                link.labelKey;
              const badgeCount =
                "badgeKey" in link && link.badgeKey
                  ? badges[link.badgeKey] || 0
                  : 0;

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--background-muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {badgeCount > 0 && (
                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-[var(--danger)] text-white"
                        )}
                      >
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--border-color)] p-4">
          <p className="text-xs text-[var(--foreground-muted)]">
            E-nergy © {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  );
}
