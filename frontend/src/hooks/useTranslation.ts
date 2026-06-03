import { useI18n } from "@/components/providers/I18nProvider";

/**
 * Hook to translate keys and manage application locale settings.
 * 
 * Usage:
 * ```tsx
 * const { t, locale, changeLocale } = useTranslation();
 * return <div>{t("menu.dashboard")}</div>;
 * ```
 */
export function useTranslation() {
  return useI18n();
}
