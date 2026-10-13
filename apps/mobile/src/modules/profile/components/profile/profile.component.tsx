import { useTranslation } from "react-i18next";
import { ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSheet } from "@/components/language-sheet";
import { ThemeSheet } from "@/components/theme-sheet";
import { useTheme } from "@/hooks/use-theme";

import { ProfileCard } from "../profile-card";
import { ProfileHeader } from "../profile-header";
import { ProfileRow } from "../profile-row";
import { SignOutSheet } from "../sign-out-sheet";

import { useProfile } from "./profile.hook";

export function Profile() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    name,
    role,
    whatsappVisible,
    themeLabel,
    isDark,
    languageLabel,
    isPushEnabled,
    setPushEnabled,
    openEditProfile,
    openWhatsapp,
    openSchoolRules,
    showComingSoon,
    sheet,
    openSheet,
    closeSheet,
  } = useProfile();

  return (
    <View className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-[22px]"
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <ProfileHeader name={name} role={role} />

        <ProfileCard>
          <ProfileRow
            icon="pencil-outline"
            label={t("profile.editProfile")}
            onPress={openEditProfile}
          />
          <ProfileRow
            icon="logo-whatsapp"
            label={t("profile.whatsapp")}
            value={
              whatsappVisible
                ? t("profile.whatsappVisible")
                : t("profile.whatsappHidden")
            }
            onPress={openWhatsapp}
          />
          <ProfileRow
            icon={isDark ? "moon-outline" : "sunny-outline"}
            label={t("profile.theme")}
            value={themeLabel}
            onPress={() => openSheet("theme")}
          />
          <ProfileRow
            icon="language-outline"
            label={t("profile.language")}
            value={languageLabel}
            onPress={() => openSheet("language")}
          />
        </ProfileCard>

        <View className="gap-2">
          <ProfileCard>
            <ProfileRow
              icon="notifications-outline"
              label={t("profile.push")}
              trailing={
                <Switch
                  accessibilityLabel={t("profile.push")}
                  value={isPushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: theme.line, true: theme.lagoon }}
                />
              }
            />
          </ProfileCard>
          <Text className="ds-text-list-subtitle px-1 text-ink-2">
            {t("profile.pushNote")}
          </Text>
        </View>

        <ProfileCard>
          <ProfileRow
            icon="shield-outline"
            label={t("profile.schoolRules")}
            onPress={openSchoolRules}
          />
          <ProfileRow
            icon="document-text-outline"
            label={t("profile.cancellationRules")}
            onPress={showComingSoon}
          />
        </ProfileCard>

        <ProfileCard>
          <ProfileRow
            icon="log-out-outline"
            label={t("profile.signOut")}
            hideChevron
            onPress={() => openSheet("signOut")}
          />
        </ProfileCard>
      </ScrollView>

      <ThemeSheet visible={sheet === "theme"} onClose={closeSheet} />
      <LanguageSheet visible={sheet === "language"} onClose={closeSheet} />
      <SignOutSheet visible={sheet === "signOut"} onClose={closeSheet} />
    </View>
  );
}
