import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Locale } from "@/lib/i18n";

interface PreferencesState {
  locale: Locale;
  theme: "light" | "dark";
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      theme: "light",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    {
      name: "e-nergy-preferences",
    }
  )
);
