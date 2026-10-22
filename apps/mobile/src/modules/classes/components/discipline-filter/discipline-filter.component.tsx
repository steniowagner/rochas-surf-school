import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DisciplineFilterMenu } from "../discipline-filter-menu";

import type { DisciplineFilterProps } from "./discipline-filter.types";

/**
 * The floating sport filter of the week screen (AGENDA-01B): a `grape` button at the bottom right that opens the
 * three options over a backdrop dimming the whole phone. Choosing one closes them; the button and the backdrop close
 * them unchanged.
 */
export function DisciplineFilter({ value, onChange }: DisciplineFilterProps) {
  return (
    // Its own provider measures this view, so on iOS the bottom inset includes the tab bar the screen extends under,
    // and its frame places the open options, drawn over the whole window, where the button is.
    <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <DisciplineFilterMenu value={value} onChange={onChange} />
    </SafeAreaProvider>
  );
}
