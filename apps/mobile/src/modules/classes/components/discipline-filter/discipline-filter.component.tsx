import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaListener,
  useSafeAreaFrame,
  useSafeAreaInsets,
  type Metrics,
} from "react-native-safe-area-context";

import { DisciplineFilterMenu } from "../discipline-filter-menu";

import type { DisciplineFilterProps } from "./discipline-filter.types";

/**
 * The floating sport filter of the week screen (AGENDA-01B): a `grape` button at the bottom right that opens the
 * three options over a backdrop dimming the whole phone. Choosing one closes them; the button and the backdrop close
 * them unchanged.
 */
export function DisciplineFilter({ value, onChange }: DisciplineFilterProps) {
  const parentFrame = useSafeAreaFrame();
  const parentInsets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  return (
    <>
      {/* Measured over the whole screen, so on iOS the bottom inset includes the tab bar the screen extends under, and
          the frame places the open options, drawn over the whole window, where the button is.
          On Android the listener's native view ignores `pointerEvents` and claims every touch over the list, so its
          parent keeps touches away from it, or the list under it would neither scroll nor refresh. */}
      <View
        testID="discipline-filter-metrics"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <SafeAreaListener
          style={StyleSheet.absoluteFill}
          onChange={setMetrics}
        />
      </View>
      <SafeAreaFrameContext.Provider value={metrics?.frame ?? parentFrame}>
        <SafeAreaInsetsContext.Provider value={metrics?.insets ?? parentInsets}>
          <DisciplineFilterMenu value={value} onChange={onChange} />
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </>
  );
}
