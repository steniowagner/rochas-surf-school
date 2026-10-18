import { routes } from "@/constants/routes";
import { ClassesWeekScreen } from "@/modules/classes/screens/classes-week.screen";

export default function ClassesRoute() {
  return (
    <ClassesWeekScreen
      titleKey="tabs.classes"
      classRoute={routes.admin.classDetail}
      canCreate
      showFlags
    />
  );
}
