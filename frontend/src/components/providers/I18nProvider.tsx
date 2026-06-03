"use client";

import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LocaleInfo } from "@/locales/registry";
import { athleteService } from "@/lib/services/settings";
import { useIsAuthenticated } from "@/stores/auth.store";

type Translations = Record<string, any>;

interface I18nContextType {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
  changeLocale: (newLocale: string) => Promise<void>;
  supportedLocales: LocaleInfo[];
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

const loadTranslations = async (lang: string): Promise<Translations> => {
  try {
    switch (lang) {
      case "en":
        return (await import("@/locales/en.json")).default;
      case "vi":
      default:
        return (await import("@/locales/vi.json")).default;
    }
  } catch (error) {
    console.error(`Failed to load translations for locale: ${lang}`, error);
    // Fallback to English/Vietnamese inline static import or empty object
    return {};
  }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState<boolean>(true);
  const isAuthenticated = useIsAuthenticated();
  const [, startTransition] = useTransition();

  // Load initial translations on mount
  useEffect(() => {
    const initializeI18n = async () => {
      let activeLocale = DEFAULT_LOCALE;

      // Try LocalStorage first
      const storedLocale = localStorage.getItem("cf_locale");
      if (storedLocale) {
        activeLocale = storedLocale;
      } else if (typeof navigator !== "undefined") {
        // Fallback to browser language
        const browserLang = navigator.language.split("-")[0];
        if (SUPPORTED_LOCALES.some((l) => l.code === browserLang)) {
          activeLocale = browserLang;
        }
      }

      const trans = await loadTranslations(activeLocale);
      setTranslations(trans);
      setLocale(activeLocale);
      setLoading(false);
    };

    initializeI18n();
  }, []);

  // Sync profile language once user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUserProfileSettings = async () => {
      try {
        const profile = await athleteService.getProfile();
        const profileLocale = profile.settings?.locale;
        if (profileLocale && profileLocale !== locale) {
          const trans = await loadTranslations(profileLocale);
          setTranslations(trans);
          setLocale(profileLocale);
          localStorage.setItem("cf_locale", profileLocale);
        }
      } catch (err) {
        console.warn("Failed to fetch user settings for locale sync", err);
      }
    };

    fetchUserProfileSettings();
  }, [isAuthenticated]);

  const changeLocale = async (newLocale: string) => {
    if (!SUPPORTED_LOCALES.some((l) => l.code === newLocale)) return;
    
    setLoading(true);
    try {
      const trans = await loadTranslations(newLocale);
      startTransition(() => {
        setTranslations(trans);
        setLocale(newLocale);
        localStorage.setItem("cf_locale", newLocale);
      });

      // Synchronize with API if logged in
      if (isAuthenticated) {
        const profile = await athleteService.getProfile();
        await athleteService.updateProfile({
          settings: {
            ...profile.settings,
            locale: newLocale,
          },
        });
      }
    } catch (error) {
      console.error("Failed to change locale:", error);
    } finally {
      setLoading(false);
    }
  };

  // Translation function: translates dot-notated keys (e.g., 'profile.basicInfo')
  const t = (key: string, vars?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // return key if not found
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Replace template variables like {username} with provided vars
    if (vars) {
      return Object.entries(vars).reduce<string>((str, [k, v]) => {
        return str.replace(new RegExp(`{${k}}`, "g"), String(v));
      }, value);
    }

    return value;
  };

  return (
    <I18nContext.Provider
      value={{
        t,
        locale,
        changeLocale,
        supportedLocales: SUPPORTED_LOCALES,
        loading,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
