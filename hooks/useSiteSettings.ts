"use client";

import { useFetch } from "./useFetch";
import { ISiteSettings } from "@/types";

interface SiteSettingsResponse {
  settings: ISiteSettings;
}

export function useSiteSettings() {
  const { data, isLoading } = useFetch<SiteSettingsResponse>("/api/settings");

  return {
    siteName: data?.settings.siteName || "E-nergy",
    logoUrl: data?.settings.logoUrl,
    isLoading,
  };
}
