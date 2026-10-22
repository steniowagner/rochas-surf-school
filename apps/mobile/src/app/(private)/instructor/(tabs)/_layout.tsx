import { RoleTabs } from "@/components/role-tabs";

const tabs = [
  { name: "(home)", labelKey: "tabs.home", sf: "house", md: "home" },
  { name: "classes", labelKey: "tabs.classes", sf: "calendar", md: "calendar_today" },
  { name: "profile", labelKey: "tabs.profile", sf: "person.crop.circle", md: "person" },
];

export default function TabsLayout() {
  return <RoleTabs tabs={tabs} />;
}
