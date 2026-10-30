import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { roleChip } from "../../utils/role-chip";
import { PersonAvatar } from "../person-avatar";
import { RemovalInfoRow } from "../removal-info-row";

import { useRemovedAccountRow } from "./removed-account-row.hook";
import { RemovedAccountRowProps } from "./removed-account-row.types";

/** One removed account as a card, like the decision cards: the avatar with the name and role chip, and below them when it was removed and the day it is deleted for good, with Restore beside those dates. */
export function RemovedAccountRow({
  account,
  onPress,
  onRestore,
  isRestoring,
  disabled,
}: RemovedAccountRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { removedOn, deletedOn } = useRemovedAccountRow(account);
  const { tone, labelKey } = roleChip[account.role];

  return (
    <View
      className="gap-3 rounded-card border border-line bg-surface p-4"
      style={shadowStyle("card", theme)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={account.name}
        onPress={() => onPress(account)}
        className="flex-row items-center gap-3"
      >
        <PersonAvatar name={account.name} photoUrl={account.photoUrl} size="lg" />
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} className="ds-text-list-title text-ink">
            {account.name}
          </Text>
          <View className="flex-row">
            <Chip tone={tone}>{t(labelKey)}</Chip>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.ink3} />
      </Pressable>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-2">
          <RemovalInfoRow icon="close-circle-outline" text={removedOn} />
          <RemovalInfoRow icon="trash-outline" text={deletedOn} tone="danger" />
        </View>
        {/* The dimming sits on this wrapper: a TouchableOpacity sets its own opacity, which would override a class on the button. */}
        <View className={disabled ? "opacity-50" : ""}>
          <Button
            variant="outline"
            // A little narrower than the default button; the height stays at the 44 pt touch target.
            style={{ paddingHorizontal: 14 }}
            loading={isRestoring}
            disabled={disabled}
            onPress={() => onRestore(account)}
            accessibilityLabel={`${t("people.removed.restore")} ${account.name}`}
          >
            {t("people.removed.restore")}
          </Button>
        </View>
      </View>
    </View>
  );
}
