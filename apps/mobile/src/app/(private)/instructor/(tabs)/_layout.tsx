import { RoleTabs } from "@/components/role-tabs";
import type { RoleTab } from "@/components/role-tabs/role-tabs.types";

const tabs: RoleTab[] = [
  {
    name: "(home)",
    labelKey: "tabs.home",
    icon: { set: "Feather", name: "home" },
  },
  {
    name: "classes",
    labelKey: "tabs.classes",
    icon: { set: "Ionicons", name: "calendar-outline" },
  },
  {
    name: "people",
    labelKey: "tabs.people",
    icon: { set: "Feather", name: "users" },
  },
  {
    name: "profile",
    labelKey: "tabs.profile",
    icon: { set: "FontAwesome6", name: "circle-user" },
  },
];

export default function TabsLayout() {
  return <RoleTabs tabs={tabs} />;
}
