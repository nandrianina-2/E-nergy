"use client";

import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/lib/store/preferences";
import { getDictionary, Locale } from "@/lib/i18n";

export function useTranslation() {
  const { data: session } = useSession();
  const storeLocale = usePreferencesStore((s) => s.locale);
  const setLocale = usePreferencesStore((s) => s.setLocale);

  // Priorité à la langue du profil utilisateur connecté, sinon préférence locale
  const locale: Locale = (session?.user?.language as Locale) || storeLocale;

  const dict = getDictionary(locale);

  return { t: dict, locale, setLocale };
}
