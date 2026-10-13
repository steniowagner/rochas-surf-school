import { RoleTabs } from "@/components/role-tabs";

const tabs = [
  { name: "index", labelKey: "tabs.agenda", sf: "calendar", md: "calendar_today" },
  { name: "my-classes", labelKey: "tabs.myClasses", sf: "figure.surfing", md: "surfing" },
  { name: "school", labelKey: "tabs.school", sf: "person.2", md: "group" },
  { name: "profile", labelKey: "tabs.profile", sf: "person.crop.circle", md: "person" },
];

export default function StudentTabsLayout() {
  return <RoleTabs tabs={tabs} />;
}
