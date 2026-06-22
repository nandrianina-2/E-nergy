"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Zap } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { siteName, logoUrl } = useSiteSettings();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--background)]/95 px-3 py-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="flex-shrink-0 rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)] md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo + nom du site : visible uniquement sur mobile, la sidebar le montre déjà sur desktop */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 md:hidden"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={28}
              height={28}
              className="h-7 w-7 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
          )}
          <span className="truncate font-display text-base font-bold text-[var(--foreground)]">
            {siteName}
          </span>
        </Link>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        <NotificationsDropdown />
        <UserMenu />
      </div>
    </header>
  );
}
