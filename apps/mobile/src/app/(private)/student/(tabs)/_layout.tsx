import { RoleTabs } from "@/components/role-tabs";
import type { RoleTab } from "@/components/role-tabs/role-tabs.types";

const tabs: RoleTab[] = [
  {
    name: "(agenda)",
    labelKey: "tabs.agenda",
    icon: { set: "Ionicons", name: "calendar-outline" },
  },
  {
    name: "my-classes",
    labelKey: "tabs.myClasses",
    icon: { set: "Ionicons", name: "ticket-outline" },
  },
  {
    name: "school",
    labelKey: "tabs.school",
    icon: { set: "Feather", name: "users" },
  },
  {
    name: "profile",
    labelKey: "tabs.profile",
    icon: { set: "FontAwesome6", name: "circle-user" },
  },
];

export default function StudentTabsLayout() {
  return <RoleTabs tabs={tabs} />;
}
