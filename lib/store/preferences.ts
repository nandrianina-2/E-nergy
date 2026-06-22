import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Locale } from "@/lib/i18n";

interface PreferencesState {
  locale: Locale;
  theme: "light" | "dark";
  soundEnabled: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  toggleSound: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      theme: "light",
      soundEnabled: true,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
    }),
    {
      name: "e-nergy-preferences",
    }
  )
);
