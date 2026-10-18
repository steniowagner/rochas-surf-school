import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import { ArchiveLocationSheetProps } from "./archive-location-sheet.types";

/** "Remover local?": the confirmation before a location is archived. */
export function ArchiveLocationSheet({
  visible,
  name,
  address,
  upcomingClasses,
  loading,
  onConfirm,
  onClose,
}: ArchiveLocationSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">
            {t("archiveLocation.title")}
          </Text>
          <Text className="ds-text-list-title text-ink">{name}</Text>
          <Text className="ds-text-list-subtitle text-ink-2">{address}</Text>
          <Text className="ds-text-body text-ink-2">
            {t("archiveLocation.description")}
          </Text>
          {upcomingClasses > 0 ? (
            <Text className="ds-text-body text-ink-2">
              {t("archiveLocation.kept", { count: upcomingClasses })}
            </Text>
          ) : null}
        </View>
        <Button variant="danger" loading={loading} onPress={onConfirm}>
          {t("archiveLocation.confirm")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("archiveLocation.keep")}
        </Button>
      </View>
    </BottomModal>
  );
}
