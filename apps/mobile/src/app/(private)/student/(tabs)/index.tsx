import { routes } from "@/constants/routes";
import { ClassesWeekScreen } from "@/modules/classes/screens/classes-week.screen";

export default function StudentRoute() {
  return (
    <ClassesWeekScreen
      titleKey="tabs.agenda"
      classRoute={routes.student.classDetail}
    />
  );
}
