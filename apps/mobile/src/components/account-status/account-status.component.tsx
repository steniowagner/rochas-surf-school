import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";

import { AccountStatusProps, AccountStatusTone } from "./account-status.types";

const TILE_CLASS_NAMES: Record<AccountStatusTone, string> = {
  bad: "bg-bad-tint",
  dim: "bg-dim",
  sand: "bg-sand",
};

const ICON_COLORS = {
  bad: "bad",
  dim: "ink2",
  sand: "grape",
} as const;

export function AccountStatus({
  tone,
  icon,
  eyebrow,
  title,
  description,
  note,
  primaryAction,
  onUseAnotherEmail,
}: AccountStatusProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
              name={icon}
              size={30}
              color={theme[ICON_COLORS[tone]]}
            />
          }
          iconTileClassName={TILE_CLASS_NAMES[tone]}
          eyebrow={eyebrow}
          eyebrowClassName={tone === "bad" ? "text-bad" : "text-ink-2"}
          title={title}
          description={description}
        />

        {note ? (
          <View className="gap-1 rounded-card border border-line bg-surface p-4">
            <Text className="ds-text-list-title text-ink">{note.title}</Text>
            <Text className="ds-text-list-subtitle text-ink-2">
              {note.text}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="gap-3">
        {primaryAction}
        <Button variant="ghost" onPress={onUseAnotherEmail}>
          {t("closedAccount.useAnotherEmail")}
        </Button>
      </View>
    </View>
  );
}
