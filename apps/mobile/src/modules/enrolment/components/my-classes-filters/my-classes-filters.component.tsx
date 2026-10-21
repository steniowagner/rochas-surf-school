import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { MY_CLASSES_FILTERS } from "../../utils/my-classes-filter";
import { MyClassesFiltersProps } from "./my-classes-filters.types";

/** The status chips of "Minhas aulas", in one horizontal row; exactly one is selected. */
export function MyClassesFilters({ selected, onSelect }: MyClassesFiltersProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-screen"
      contentContainerClassName="gap-2 px-screen"
    >
      {MY_CLASSES_FILTERS.map((filter) => {
        const isSelected = filter === selected;

        return (
          <TouchableOpacity
            key={filter}
            accessibilityRole="button"
            accessibilityLabel={t(`myClasses.filters.${filter}`)}
            accessibilityState={{ selected: isSelected }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => onSelect(filter)}
            className={`min-h-11 flex-row items-center rounded-full border px-4 ${
              isSelected ? "border-grape bg-grape" : "border-line bg-surface"
            }`}
          >
            <Text className={`ds-text-chip ${isSelected ? "text-on-color" : "text-ink"}`}>
              {t(`myClasses.filters.${filter}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
