import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { iconSizes, shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { DisciplineFilterValue } from "../../classes.types";

import type { DisciplineFilterProps } from "./discipline-filter.types";

const OPTIONS: DisciplineFilterValue[] = ["all", "surf", "skate"];
const BOTTOM_EDGE: Edge[] = ["bottom"];

/**
 * The floating sport filter of the week screen (AGENDA-01B): a `grape` button at the bottom right that opens the
 * three options over a backdrop. Choosing one closes them; the button and the backdrop close them unchanged.
 */
export function DisciplineFilter({ value, onChange }: DisciplineFilterProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const select = (option: DisciplineFilterValue) => {
    setIsOpen(false);
    onChange(option);
  };

  return (
    // Its own provider measures this view, so on iOS the bottom inset includes the tab bar the screen extends under.
    <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isOpen ? (
        <Pressable
          testID="discipline-filter-backdrop"
          accessible={false}
          className="absolute inset-0 bg-scrim"
          onPress={() => setIsOpen(false)}
        />
      ) : null}
      <SafeAreaView
        edges={BOTTOM_EDGE}
        pointerEvents="box-none"
        style={styles.anchor}
      >
        <View
          pointerEvents="box-none"
          className="items-end gap-2.5 pb-4 pr-screen"
        >
          {isOpen
            ? OPTIONS.map((option) => {
                const selected = option === value;

                return (
                  <TouchableOpacity
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    activeOpacity={BUTTON_ACTIVE_OPACITY}
                    onPress={() => select(option)}
                    className={`h-11 justify-center rounded-control border px-4 ${selected ? "border-grape bg-grape" : "border-line bg-surface"}`}
                    style={shadowStyle("menuOption", theme)}
                  >
                    <Text
                      className={`ds-text-pill ${selected ? "text-on-color" : "text-ink"}`}
                    >
                      {t(`classesWeek.disciplineFilter.${option}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : null}
          <TouchableOpacity
            testID="discipline-filter-button"
            accessibilityRole="button"
            accessibilityLabel={t(
              isOpen
                ? "classesWeek.disciplineFilter.close"
                : "classesWeek.disciplineFilter.open",
            )}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => setIsOpen((open) => !open)}
            className={`h-14 w-14 items-center justify-center rounded-card bg-grape ${isOpen ? "-rotate-90" : ""}`}
            style={shadowStyle("fab", theme)}
          >
            <Ionicons
              name={isOpen ? "close" : "filter"}
              size={iconSizes.bar}
              color={theme.onColor}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  anchor: { ...StyleSheet.absoluteFill, justifyContent: "flex-end" },
});
