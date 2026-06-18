"use client";

import { Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)] md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="font-display text-lg font-semibold text-[var(--foreground)] sm:text-xl">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NotificationsDropdown />
        <UserMenu />
      </div>
    </header>
  );
}
