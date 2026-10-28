import { RoleTabs } from "@/components/role-tabs";

const tabs = [
  { name: "(home)", labelKey: "tabs.panel", sf: "chart.bar", md: "bar_chart" },
  { name: "classes", labelKey: "tabs.classes", sf: "calendar", md: "calendar_today" },
  { name: "people", labelKey: "tabs.people", sf: "person.2", md: "group" },
  { name: "profile", labelKey: "tabs.profile", sf: "person.crop.circle", md: "person" },
];

export default function TabsLayout() {
  return <RoleTabs tabs={tabs} />;
}
