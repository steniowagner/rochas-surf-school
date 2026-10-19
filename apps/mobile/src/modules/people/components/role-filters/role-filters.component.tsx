import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { PEOPLE_ROLES } from "../../constants/people";
import { RoleFiltersProps } from "./role-filters.types";

/** One toggle button per role: the list shows the users that have at least one of the selected roles. */
export function RoleFilters({ roles, onToggle }: RoleFiltersProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {PEOPLE_ROLES.map((role) => {
        const selected = roles.includes(role);

        return (
          <TouchableOpacity
            key={role}
            accessibilityRole="button"
            accessibilityLabel={t(`people.filter.${role}`)}
            accessibilityState={{ selected }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => onToggle(role)}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-full border px-4 ${
              selected ? "border-grape bg-grape" : "border-line bg-surface"
            }`}
          >
            <Text
              className={`ds-text-chip ${selected ? "text-on-color" : "text-ink"}`}
            >
              {t(`people.filter.${role}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
