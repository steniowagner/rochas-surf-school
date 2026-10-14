import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { PeopleRoleFilter } from "../../hooks/use-people-screen.types";
import { PeopleSort } from "../../people.types";

import { FilterSheetProps } from "./filter-sheet.types";

export function FilterSheet({
  visible,
  onClose,
  role,
  sort,
  onRoleChange,
  onSortChange,
}: FilterSheetProps) {
  const { t } = useTranslation();

  const roleOptions: { value: PeopleRoleFilter; label: string }[] = [
    { value: "all", label: t("people.filter.all") },
    { value: "student", label: t("people.filter.student") },
    { value: "instructor", label: t("people.filter.instructor") },
    { value: "admin", label: t("people.filter.admin") },
  ];
  const sortOptions: { value: PeopleSort; label: string }[] = [
    { value: "recent", label: t("people.filter.sortRecent") },
    { value: "name", label: t("people.filter.sortName") },
  ];

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-5">
        <Text className="ds-text-sheet-title text-ink">
          {t("people.filter.title")}
        </Text>
        <View className="gap-2">
          <Text className="ds-text-section-label text-ink-2">
            {t("people.filter.roleLabel")}
          </Text>
          <SegmentedControl
            options={roleOptions}
            value={role}
            onChange={onRoleChange}
          />
        </View>
        <View className="gap-2">
          <Text className="ds-text-section-label text-ink-2">
            {t("people.filter.sortLabel")}
          </Text>
          <SegmentedControl
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
          />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onClose}
          className="min-h-11 items-center justify-center"
        >
          <Text className="ds-text-button text-lagoon">{t("common.close")}</Text>
        </TouchableOpacity>
      </View>
    </BottomModal>
  );
}
