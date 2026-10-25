import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { iconSizes, shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  BACKDROP_ENTERING,
  DISCIPLINE_FILTER_OPTIONS,
  OPTION_ENTERING,
} from "../discipline-filter/discipline-filter.constants";

import { useDisciplineFilterHeaderButton } from "./discipline-filter-header-button.hook";
import type { DisciplineFilterHeaderButtonProps } from "./discipline-filter-header-button.types";

// The native header's height under the status bar: the options start just below it.
const HEADER_HEIGHT = 56;

/**
 * The sport filter as a header action (the admin's Classes): the floating button's `grape` filter icon, as its own
 * circle beside the "+", and the same options, listed under the header at the right over a backdrop.
 */
export function DisciplineFilterHeaderButton({
  value,
  onChange,
}: DisciplineFilterHeaderButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isOpen, open, close, select } = useDisciplineFilterHeaderButton({
    onChange,
  });

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("classesWeek.disciplineFilter.open")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={open}
        className="h-11 w-11 items-center justify-center rounded-full bg-grape"
      >
        <Ionicons name="filter" size={iconSizes.bar} color={theme.onColor} />
      </TouchableOpacity>
      <Modal
        testID="discipline-filter-overlay"
        visible={isOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
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
        <View
          pointerEvents="box-none"
          className="items-end gap-2.5 px-screen"
          style={{ paddingTop: insets.top + HEADER_HEIGHT }}
        >
          {DISCIPLINE_FILTER_OPTIONS.map((option, index) => {
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
          })}
        </View>
      </Modal>
    </>
  );
}
