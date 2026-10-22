import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  SafeAreaProvider,
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { iconSizes, shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  BACKDROP_ENTERING,
  DISCIPLINE_FILTER_OPTIONS,
  OPTION_ENTERING,
} from "./discipline-filter.constants";
import { useDisciplineFilter } from "./discipline-filter.hook";
import type { DisciplineFilterProps } from "./discipline-filter.types";

const BOTTOM_EDGE: Edge[] = ["bottom"];

/**
 * The floating sport filter of the week screen (AGENDA-01B): a `grape` button at the bottom right that opens the
 * three options over a backdrop. Choosing one closes them; the button and the backdrop close them unchanged.
 */
export function DisciplineFilter({ value, onChange }: DisciplineFilterProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isOpen, toggle, close, select, buttonTurnStyle } =
    useDisciplineFilter({ onChange });

  return (
    // Its own provider measures this view, so on iOS the bottom inset includes the tab bar the screen extends under.
    <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isOpen ? (
        <Animated.View
          testID="discipline-filter-backdrop-fade"
          entering={BACKDROP_ENTERING}
          className="absolute inset-0 bg-scrim"
        >
          <Pressable
            testID="discipline-filter-backdrop"
            accessible={false}
            className="flex-1"
            onPress={close}
          />
        </Animated.View>
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
            ? DISCIPLINE_FILTER_OPTIONS.map((option, index) => {
                const selected = option === value;

                return (
                  <Animated.View
                    key={option}
                    testID={`discipline-filter-option-${option}`}
                    entering={OPTION_ENTERING[index]}
                  >
                    <TouchableOpacity
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
                  </Animated.View>
                );
              })
            : null}
          {/* The whole button turns, shadow included, as in the design. */}
          <Animated.View
            testID="discipline-filter-button-turn"
            style={buttonTurnStyle}
          >
            <TouchableOpacity
              testID="discipline-filter-button"
              accessibilityRole="button"
              accessibilityLabel={t(
                isOpen
                  ? "classesWeek.disciplineFilter.close"
                  : "classesWeek.disciplineFilter.open",
              )}
              activeOpacity={BUTTON_ACTIVE_OPACITY}
              onPress={toggle}
              className="h-14 w-14 items-center justify-center rounded-card bg-grape"
              style={shadowStyle("fab", theme)}
            >
              <Ionicons
                name={isOpen ? "close" : "filter"}
                size={iconSizes.bar}
                color={theme.onColor}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  anchor: { ...StyleSheet.absoluteFill, justifyContent: "flex-end" },
});
