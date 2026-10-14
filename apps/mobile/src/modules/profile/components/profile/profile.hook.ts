import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";

import { routes } from "@/constants/routes";
import { localeNames, type AppLocale } from "@/i18n/locales";
import { usePushPreference } from "@/modules/notifications/hooks/use-push-preference.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { useThemePreference } from "@/services/preferences/theme-preference";

import { useOpenUrl } from "../../hooks/use-open-url.hook";
import { getWebPageUrl } from "../../utils/web-pages";

import { ProfileRole, ProfileSheet } from "./profile.types";

export const useProfile = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useThemePreference();
  const colorScheme = useColorScheme();
  const { user } = useSession();
  const alertMessage = useAlertMessage();
  const push = usePushPreference();
  const openUrl = useOpenUrl();
  const [sheet, setSheet] = useState<ProfileSheet | null>(null);

  // The tabs only exist for the three roles, so the account always has one of them here.
  const roleRoutes = routes[(user?.role ?? "student") as ProfileRole];

  const locale = i18n.language as AppLocale;
  const privacyPolicyUrl = getWebPageUrl("privacy-policy", locale);
  const termsOfUseUrl = getWebPageUrl("terms-of-use", locale);

  return {
    name: user?.name ?? "",
    role: user?.role ?? "student",
    whatsappVisible: user?.whatsappVisible ?? false,
    themeLabel: t(`theme.${theme}`),
    // The icon follows the theme in effect, which for "same as phone" is the phone's.
    isDark: (theme === "system" ? colorScheme : theme) === "dark",
    languageLabel: localeNames[i18n.language as AppLocale],
    isPushEnabled: push.enabled,
    setPushEnabled: (enabled: boolean) => void push.setEnabled(enabled),
    openEditProfile: () => router.push(roleRoutes.editProfile),
    openWhatsapp: () => router.push(roleRoutes.whatsapp),
    openSchoolRules: () => router.push(roleRoutes.schoolRules),
    // Without the web address the rows that open the web pages are hidden.
    openPrivacyPolicy: privacyPolicyUrl
      ? () => void openUrl(privacyPolicyUrl)
      : null,
    openTermsOfUse: termsOfUseUrl ? () => void openUrl(termsOfUseUrl) : null,
    showComingSoon: () => alertMessage.show(t("profile.comingSoon")),
    sheet,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
  };
};
