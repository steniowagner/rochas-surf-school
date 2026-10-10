import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Trans, useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
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
        <ScreenIntro
          icon={
            <MaterialCommunityIcons
              name="clock-outline"
              size={30}
              color={theme.warn}
            />
          }
          iconTileClassName="bg-warn-tint"
          eyebrow={t("pending.eyebrow")}
          title={t("pending.title")}
          description={
            <Trans
              i18nKey="pending.description"
              t={t}
              values={{ email }}
              components={{
                bold: <Text className="font-body-800 text-ink" />,
              }}
            />
          }
        />

        <View className="rounded-card border border-line bg-surface px-4">
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
          <View className="h-px bg-line" />
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
          <View className="h-px bg-line" />
          <PendingStep state="future" title={t("pending.steps.bookClasses")} />
        </View>
      </View>

      <Button variant="ghost" onPress={signOut}>
        {t("pending.signOut")}
      </Button>
    </View>
  );
}
