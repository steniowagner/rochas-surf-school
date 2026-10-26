import { routes } from "@/constants/routes";

import { ClassHistory, useClassHistory } from "../components/class-history";
import { useTeachingClassHistory } from "../hooks/use-teaching-class-history.hook";

import type { TeachingClassHistoryScreenProps } from "./teaching-class-history.screen.types";

/** "Aulas anteriores" of an instructor or an admin who teaches: the classes they taught, one period at a time. */
export function TeachingClassHistoryScreen({ role }: TeachingClassHistoryScreenProps) {
  const history = useClassHistory({
    useHistoryQuery: useTeachingClassHistory,
    classRoute: routes[role].classDetail,
  });

  return <ClassHistory history={history} copy="teachingHistory" />;
}
