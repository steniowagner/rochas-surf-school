import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { PersonAvatar } from "../person-avatar";

import { useRemovedAccountRow } from "./removed-account-row.hook";
import { RemovedAccountRowProps } from "./removed-account-row.types";

/** One removed account: the dimmed avatar, the name, when it was removed and until when it can be restored. */
export function RemovedAccountRow({ account, isFirst, isLast }: RemovedAccountRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { description, restore, isRestoring } = useRemovedAccountRow(account);

  return (
    <View
      className={`min-h-16 flex-row items-center gap-3 border-x border-b border-line bg-surface px-4 py-3 ${isFirst ? "rounded-t-card border-t" : ""} ${isLast ? "rounded-b-card" : ""}`}
    >
      <View className="opacity-50">
        <PersonAvatar name={account.name} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="ds-text-list-title text-ink">
          {account.name}
        </Text>
        <Text className="ds-text-list-subtitle text-ink-2">{description}</Text>
      </View>
      <View>
        <Button
          variant="outline"
          loading={isRestoring}
          onPress={restore}
          accessibilityLabel={`${t("people.removed.restore")} ${account.name}`}
          icon={<Feather name="rotate-ccw" size={16} color={theme.ink} />}
        >
          {t("people.removed.restore")}
        </Button>
      </View>
    </View>
  );
}
