import { Tabs } from "expo-router/js-tabs";
import { useTranslation } from "react-i18next";

import { TabBar } from "@/components/tab-bar";

import { RoleTabsProps } from "./role-tabs.types";

/** The tabs of a role, drawn by the shared `TabBar`. */
export function RoleTabs({ tabs }: RoleTabsProps) {
  const { t } = useTranslation();

  const icons = Object.fromEntries(tabs.map((tab) => [tab.name, tab.icon]));
  const labels = Object.fromEntries(
    tabs.map((tab) => [tab.name, t(tab.labelKey)]),
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={icons} labels={labels} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
