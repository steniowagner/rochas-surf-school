import { routes } from "@/constants/routes";
import { ClassesWeekScreen } from "@/modules/classes/screens/classes-week.screen";

export default function StudentRoute() {
  return (
    <ClassesWeekScreen
      classRoute={routes.student.classDetail}
      showEnrolment
    />
  );
}
