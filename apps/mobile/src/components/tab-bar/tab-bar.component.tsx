import { View } from "react-native";
import Animated from "react-native-reanimated";

import { TabBarItem } from "@/components/tab-bar-item";

import { INDICATOR_WIDTH } from "./tab-bar.constants";
import { useTabBar } from "./tab-bar.hook";
import { TabBarProps } from "./tab-bar.types";

/** The tab bar of the three roles: icons and labels always visible, and an orange indicator that slides along the top edge to the selected tab. */
export function TabBar({ state, navigation, icons, labels }: TabBarProps) {
  const {
    bottomInset,
    selectedIndex,
    indicatorStyle,
    handleLayout,
    handlePress,
  } = useTabBar({ state, navigation });

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-line bg-surface pt-2"
      onLayout={handleLayout}
      style={{ paddingBottom: Math.max(bottomInset, 8) }}
    >
      <Animated.View
        className="absolute -top-px left-0 h-[3px] rounded-b-full bg-sun"
        style={[{ width: INDICATOR_WIDTH }, indicatorStyle]}
      />
      {state.routes.map((route, index) => (
        <TabBarItem
          key={route.key}
          label={labels[route.name]}
          icon={icons[route.name]}
          selected={index === selectedIndex}
          onPress={() =>
            handlePress(route.key, route.name, index === selectedIndex)
          }
        />
      ))}
    </View>
  );
}
