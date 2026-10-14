import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { useLocationSheet } from "./location-sheet.hook";
import { LocationSheetProps } from "./location-sheet.types";

/** "Novo local": a name and an address saved on the spot. */
export function LocationSheet(props: LocationSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    name,
    address,
    nameMaxLength,
    addressMaxLength,
    duplicate,
    canSubmit,
    loading,
    changeName,
    changeAddress,
    submit,
    close,
  } = useLocationSheet(props);

  return (
    <BottomModal visible={props.visible} onClose={close}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">
            {t("locationSheet.title")}
          </Text>
          <Text className="ds-text-body text-ink-2">
            {t("locationSheet.description")}
          </Text>
        </View>
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="ds-text-section-label text-ink-2">
              {t("locationSheet.name")}
            </Text>
            <TextInput
              icon={<Ionicons name="location-outline" size={20} color={theme.ink2} />}
              accessibilityLabel={t("locationSheet.name")}
              placeholder={t("locationSheet.namePlaceholder")}
              value={name}
              maxLength={nameMaxLength}
              onChangeText={changeName}
              status={duplicate ? "error" : "neutral"}
              errorMessage={t("locationSheet.duplicate")}
            />
          </View>
          <View className="gap-1.5">
            <Text className="ds-text-section-label text-ink-2">
              {t("locationSheet.address")}
            </Text>
            <TextInput
              icon={<Ionicons name="map-outline" size={20} color={theme.ink2} />}
              accessibilityLabel={t("locationSheet.address")}
              placeholder={t("locationSheet.addressPlaceholder")}
              value={address}
              maxLength={addressMaxLength}
              onChangeText={changeAddress}
            />
          </View>
        </View>
        <Button
          variant="primary"
          loading={loading}
          disabled={!canSubmit}
          onPress={submit}
        >
          {t("locationSheet.submit")}
        </Button>
        <Button variant="ghost" onPress={close}>
          {t("common.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
