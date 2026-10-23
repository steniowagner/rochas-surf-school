import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  BACKDROP_ENTERING,
  DISCIPLINE_FILTER_OPTIONS,
  OPTION_ENTERING,
} from "../discipline-filter/discipline-filter.constants";
import { DisciplineFilterButton } from "../discipline-filter-button";

import { useDisciplineFilterMenu } from "./discipline-filter-menu.hook";
import type { DisciplineFilterMenuProps } from "./discipline-filter-menu.types";

/**
 * The sport filter's button and options. Closed, the button sits in the screen. Open, the backdrop, the options and the
 * button are drawn in a full-window modal, because the native header and tab bar sit above the screen's views and the
 * scrim must cover them too; they are laid out at the provider's frame, so the open button takes the closed one's place.
 */
export function DisciplineFilterMenu({
  value,
  onChange,
}: DisciplineFilterMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const { isOpen, open, close, select, buttonTurnStyle } =
    useDisciplineFilterMenu({ onChange });

  return (
    <>
      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-end"
        style={{ paddingBottom: insets.bottom }}
      >
        <View pointerEvents="box-none" className="items-end pb-4 pr-screen">
          <DisciplineFilterButton
            icon="filter"
            label={t("classesWeek.disciplineFilter.open")}
            onPress={open}
            turnStyle={buttonTurnStyle}
            turnTestID="discipline-filter-button-turn"
            hidden={isOpen}
          />
        </View>
      </View>
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
          testID="discipline-filter-layer"
          pointerEvents="box-none"
          className="absolute justify-end"
          style={{
            left: frame.x,
            top: frame.y,
            width: frame.width,
            height: frame.height,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            pointerEvents="box-none"
            className="items-end gap-2.5 pb-4 pr-screen"
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
            <DisciplineFilterButton
              icon="close"
              label={t("classesWeek.disciplineFilter.close")}
              onPress={close}
              turnStyle={buttonTurnStyle}
              turnTestID="discipline-filter-open-button-turn"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
