import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { AddressSearchField } from "../address-search-field";
import { ArchiveLocationSheet } from "../archive-location-sheet";
import { LocationMapPicker } from "../location-map-picker";

import { useLocationSheet } from "./location-sheet.hook";
import { LocationSheetProps } from "./location-sheet.types";

/** "Novo local" / "Editar local": a name, an address (with suggestions) and a point on the map. */
export function LocationSheet(props: LocationSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useLocationSheet(props);
  const { fields } = sheet;

  return (
    <>
      {/* The map takes the drags, so the sheet is dragged by its handle only. It steps aside for the removal's one. */}
      <BottomModal
        visible={props.visible && !sheet.archiveVisible}
        onClose={sheet.dismiss}
        contentPanningEnabled={false}
      >
        <View className="gap-4">
          <View className="gap-1">
            <Text className="ds-text-sheet-title text-ink">
              {sheet.editing ? t("locationSheet.editTitle") : t("locationSheet.title")}
            </Text>
            <Text className="ds-text-body text-ink-2">
              {sheet.editing
                ? t("locationSheet.editDescription")
                : t("locationSheet.description")}
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
                value={fields.name}
                maxLength={sheet.nameMaxLength}
                onChangeText={sheet.changeName}
                status={sheet.duplicate ? "error" : "neutral"}
                errorMessage={t("locationSheet.duplicate")}
              />
            </View>
            <View className="gap-1.5">
              <Text className="ds-text-section-label text-ink-2">
                {t("locationSheet.address")}
              </Text>
              <AddressSearchField
                value={fields.address}
                maxLength={sheet.addressMaxLength}
                suggestions={sheet.suggestions}
                onChangeText={sheet.changeAddress}
                onPick={sheet.pickSuggestion}
              />
            </View>
            <LocationMapPicker point={fields.point} onChange={sheet.changePoint} />
            {sheet.showNotify ? (
              <View>
                <Checkbox
                  checked={fields.notify}
                  onChange={sheet.changeNotify}
                  label={t("locationSheet.notify")}
                />
                <Text className="ds-text-list-subtitle px-1 text-ink-2">
                  {t("locationSheet.notifyCount", { count: sheet.upcomingClasses })}
                </Text>
              </View>
            ) : null}
          </View>
          <Button
            variant="primary"
            loading={sheet.loading}
            disabled={!sheet.canSubmit}
            onPress={sheet.submit}
          >
            {sheet.editing ? t("locationSheet.save") : t("locationSheet.submit")}
          </Button>
          {sheet.editing ? (
            <Button variant="outline" onPress={sheet.openArchive}>
              {t("locationSheet.remove")}
            </Button>
          ) : null}
          <Button variant="ghost" onPress={sheet.close}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomModal>
      {props.location ? (
        <ArchiveLocationSheet
          visible={sheet.archiveVisible}
          name={props.location.name}
          address={props.location.address}
          upcomingClasses={sheet.upcomingClasses}
          loading={sheet.archiving}
          onConfirm={sheet.confirmArchive}
          onClose={sheet.closeArchive}
        />
      ) : null}
    </>
  );
}
