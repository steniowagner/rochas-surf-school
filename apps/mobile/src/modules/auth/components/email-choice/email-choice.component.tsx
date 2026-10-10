import { Ionicons } from "@expo/vector-icons";
import { Trans, useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextButton } from "@/components/ui/text-button";
import { useTheme } from "@/hooks/use-theme";

import { ChoiceRow } from "../choice-row";
import { EmailChoiceProps } from "./email-choice.types";

export function EmailChoice({
  onHaveAccountPress = () => {},
  onNewPress = () => {},
}: EmailChoiceProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-page px-[22px]"
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <BackButton />

      <View className="mt-6 gap-6">
        <ScreenIntro
          icon={<Ionicons name="mail-outline" size={28} color={theme.grape} />}
          title={t("emailChoice.title")}
          description={t("emailChoice.subtitle")}
        />

        <View className="gap-3">
          <ChoiceRow
            icon="log-in-outline"
            title={t("emailChoice.existing.title")}
            description={t("emailChoice.existing.description")}
            onPress={onHaveAccountPress}
          />
          <ChoiceRow
            icon="person-add-outline"
            title={t("emailChoice.new.title")}
            description={t("emailChoice.new.description")}
            onPress={onNewPress}
          />
        </View>
      </View>

      <View className="min-h-6 flex-1" />

      <Text className="ds-text-list-subtitle mx-2 text-center text-ink-2">
        {/* `t` makes the element depend on the language: Trans doesn't re-render on language changes by itself. */}
        <Trans
          i18nKey="auth.terms"
          t={t}
          components={{
            terms: <TextButton />,
            privacy: <TextButton />,
          }}
        />
      </Text>
    </View>
  );
}
