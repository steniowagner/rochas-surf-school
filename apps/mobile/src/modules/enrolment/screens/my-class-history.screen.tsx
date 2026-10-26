import { routes } from "@/constants/routes";
import { ClassHistory, useClassHistory } from "@/modules/classes/components/class-history";

import { useMyClassHistory } from "../hooks/use-my-class-history.hook";

/** The student's "Aulas anteriores": the classes they took, one period at a time. */
export function MyClassHistoryScreen() {
  const history = useClassHistory({
    useHistoryQuery: useMyClassHistory,
    classRoute: routes.student.classDetail,
  });

  return <ClassHistory history={history} copy="myHistory" />;
}
