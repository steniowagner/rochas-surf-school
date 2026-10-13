import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { usePushPreference } from "@/modules/notifications/hooks/use-push-preference.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";

import { ProfileRole, ProfileSheet } from "./profile.types";

export const useProfile = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const alertMessage = useAlertMessage();
  const push = usePushPreference();
  const [sheet, setSheet] = useState<ProfileSheet | null>(null);

  // The tabs only exist for the three roles, so the account always has one of them here.
  const roleRoutes = routes[(user?.role ?? "student") as ProfileRole];

  return {
    name: user?.name ?? "",
    role: user?.role ?? "student",
    whatsappVisible: user?.whatsappVisible ?? false,
    isPushEnabled: push.enabled,
    setPushEnabled: (enabled: boolean) => void push.setEnabled(enabled),
    openEditProfile: () => router.push(roleRoutes.editProfile),
    openWhatsapp: () => router.push(roleRoutes.whatsapp),
    openSchoolRules: () => router.push(roleRoutes.schoolRules),
    showComingSoon: () => alertMessage.show(t("profile.comingSoon")),
    sheet,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
  };
};
