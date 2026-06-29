"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { ChevronDown, Sun, Moon, Globe, UserCircle, LogOut, Download, Volume2, VolumeX, Phone } from "lucide-react";
import { usePreferencesStore } from "@/lib/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session, update } = useSession();
  const { t, locale } = useTranslation();
  const setStoreLocale = usePreferencesStore((s) => s.setLocale);
  const setStoreTheme = usePreferencesStore((s) => s.setTheme);
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const toggleSound = usePreferencesStore((s) => s.toggleSound);
  const { canInstall, promptInstall } = useInstallPrompt();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTheme = session?.user?.theme || "light";

  async function persistPreference(key: "language" | "theme", value: string) {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      await update({ [key]: value });
    } catch {
      // silencieux : la préférence reste appliquée côté client via le store
    }
  }

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setStoreTheme(next);
    if (session?.user) persistPreference("theme", next);
  }

  function toggleLocale() {
    const next = locale === "fr" ? "mg" : "fr";
    setStoreLocale(next);
    if (session?.user) persistPreference("language", next);
  }

  async function handleInstall() {
    setIsOpen(false);
    const accepted = await promptInstall();
    if (accepted) {
      toast.success("Application installée");
    }
  }

  if (!session?.user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--background-muted)]"
      >
        {session.user.avatarUrl ? (
          <Image
            src={session.user.avatarUrl}
            alt={session.user.name || "Avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            {session.user.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <span className="hidden text-sm font-medium text-[var(--foreground)] sm:inline">
          {session.user.name}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--foreground-muted)]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-1.5 shadow-lg">
          <div className="border-b border-[var(--border-color)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {session.user.name}
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">
              {session.user.email}
            </p>
          </div>

          <Link
            href={
              session.user.role === "super_admin"
                ? "/super-admin/organizations"
                : session.user.role === "admin"
                ? "/admin/dashboard"
                : "/user/profile"
            }
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          >
            <UserCircle className="h-4 w-4" />
            {t.nav.profile}
          </Link>

          {session.user.role === "user" && (
            <Link
              href="/user/contact"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
            >
              <Phone className="h-4 w-4" />
              Contacter l'administrateur
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          >
            {currentTheme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {currentTheme === "light" ? t.profile.dark : t.profile.light}
          </button>

          <button
            onClick={toggleLocale}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          >
            <Globe className="h-4 w-4" />
            {locale === "fr" ? "Malagasy" : "Français"}
          </button>

          <button
            onClick={toggleSound}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            {soundEnabled ? "Désactiver les sons" : "Activer les sons"}
          </button>

          {canInstall && (
            <button
              onClick={handleInstall}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background-muted)]"
            >
              <Download className="h-4 w-4" />
              Installer l'application
            </button>
          )}

          <div className="my-1 border-t border-[var(--border-color)]" />

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
          >
            <LogOut className="h-4 w-4" />
            {t.nav.logout}
          </button>
        </div>
      )}
    </div>
  );
}
