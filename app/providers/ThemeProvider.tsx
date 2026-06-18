"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/lib/store/preferences";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const storeTheme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);

  const theme = session?.user?.theme || storeTheme;

  useEffect(() => {
    // Synchronise le thème du profil utilisateur connecté vers le store local
    if (session?.user?.theme && session.user.theme !== storeTheme) {
      setTheme(session.user.theme);
    }
  }, [session?.user?.theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
