import { useSchoolRules } from "../hooks/use-school-rules.hook";

import { SchoolRulesReadStatus } from "./school-rules.screen.types";

export const useSchoolRulesReadScreen = () => {
  const query = useSchoolRules();
  const rules = query.data?.rules ?? [];
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: SchoolRulesReadStatus = query.data
    ? rules.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    status,
    rules,
    retrying: query.isFetching,
    retry: () => void query.refetch(),
  };
};
