import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useTranslation } from "react-i18next";
import { Platform, Text, TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { toHHmm } from "../../utils/time-ranges";

import { useTimeField } from "./time-field.hook";
import { TimeFieldProps } from "./time-field.types";

// The native picker only sizes itself to its content vertically; without a width inside a centered column its frame
// collapses to zero, so the wheels are drawn but never receive a touch.
const pickerStyle = { width: "100%" } as const;

/**
 * One time of a range. iOS shows the wheels in place. Android has no wheels: its picker is a dialog that stays up for
 * as long as it is mounted, so the field is a button that mounts the dialog until OK or Cancel.
 */
export function TimeField({ label, value, onChange, testID }: TimeFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isDialogOpen, openDialog, closeDialog, selectTime } = useTimeField({
    onChange,
  });

  if (Platform.OS !== "android") {
    return (
      <DateTimePicker
        testID={testID}
        style={pickerStyle}
        mode="time"
        display="spinner"
        is24Hour
        accentColor={theme.grape}
        value={value}
        onValueChange={onChange}
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${toHHmm(value)}`}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={openDialog}
        className="min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface py-2"
      >
        <Text className="ds-text-lesson-time text-ink">{toHHmm(value)}</Text>
      </TouchableOpacity>
      {isDialogOpen ? (
        <DateTimePicker
          testID={testID && `${testID}-dialog`}
          mode="time"
          is24Hour
          negativeButton={{ label: t("common.cancel") }}
          value={value}
          onValueChange={selectTime}
          onDismiss={closeDialog}
        />
      ) : null}
    </>
  );
}
