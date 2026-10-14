import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { CapacityStepperProps } from "./capacity-stepper.types";

/** "Lotação máxima": the number of students per class, from `min` to `max`, one at a time. */
export function CapacityStepper({
  value,
  min,
  max,
  onChange,
}: CapacityStepperProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View className="flex-row items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
      <View className="flex-row items-baseline gap-2">
        <Text className="ds-text-lesson-time text-ink">{value}</Text>
        <Text className="ds-text-list-subtitle text-ink-2">
          {t("newClass.capacity.unit")}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("newClass.capacity.decrease")}
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={() => onChange(value - 1)}
          className={`h-11 w-11 items-center justify-center rounded-full bg-sand ${atMin ? "opacity-40" : ""}`}
        >
          <Ionicons name="remove" size={22} color={theme.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("newClass.capacity.increase")}
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={() => onChange(value + 1)}
          className={`h-11 w-11 items-center justify-center rounded-full bg-sand ${atMax ? "opacity-40" : ""}`}
        >
          <Ionicons name="add" size={22} color={theme.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
