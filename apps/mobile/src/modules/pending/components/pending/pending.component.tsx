import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Trans, useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { PendingStep } from "../pending-step";

import { usePending } from "./pending.hook";

export function Pending() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { email, createdAtLabel, signOut } = usePending();

  return (
    <View
      className="flex-1 justify-between bg-page px-[22px]"
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <View className="mt-6 gap-6">
        <View className="gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-card bg-warn-tint">
            <MaterialCommunityIcons
              name="clock-outline"
              size={30}
              color={theme.warn}
            />
          </View>
          <Text className="ds-text-section-label text-ink-2">
            {t("pending.eyebrow")}
          </Text>
          <Text
            accessibilityRole="header"
            className="ds-text-screen-title text-ink"
          >
            {t("pending.title")}
          </Text>
          <Text className="ds-text-body text-ink-2">
            <Trans
              i18nKey="pending.description"
              t={t}
              values={{ email }}
              components={{
                bold: <Text className="font-body-800 text-ink" />,
              }}
            />
          </Text>
        </View>

        <View className="gap-1">
          <PendingStep
            state="done"
            title={t("pending.steps.created")}
            trailing={
              createdAtLabel ? (
                <Text className="ds-text-list-subtitle text-ink-2">
                  {createdAtLabel}
                </Text>
              ) : null
            }
          />
          <PendingStep
            state="current"
            title={t("pending.steps.approval")}
            trailing={
              <View className="rounded-full bg-warn-tint px-2.5 py-1">
                <Text className="ds-text-chip text-warn">
                  {t("pending.steps.inReview")}
                </Text>
              </View>
            }
          />
          <PendingStep state="future" title={t("pending.steps.bookClasses")} />
        </View>
      </View>

      <Button variant="ghost" onPress={signOut}>
        {t("pending.signOut")}
      </Button>
    </View>
  );
}
