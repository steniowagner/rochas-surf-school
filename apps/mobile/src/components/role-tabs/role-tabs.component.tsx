import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";

import { RoleTabsProps } from "./role-tabs.types";

/** The native tab bar of a role: selected tab in `sun`, the others in `ink-3`, on the `page` background. */
export function RoleTabs({ tabs }: RoleTabsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={theme.sun}
      iconColor={{ default: theme.ink3, selected: theme.sun }}
      labelStyle={{
        default: { color: theme.ink3 },
        selected: { color: theme.sun },
      }}
      backgroundColor={theme.page}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.labelKey)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf as never} md={tab.md as never} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
