import { Text } from "react-native";

import type { HistoryDayLabelProps } from "./history-day-label.types";

/** The label above the classes of one day of the history. */
export function HistoryDayLabel({ label }: HistoryDayLabelProps) {
  return (
    <Text accessibilityRole="header" className="ds-text-section-label pt-2 text-ink-2">
      {label}
    </Text>
  );
}
