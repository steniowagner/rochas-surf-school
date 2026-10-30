import { useSchoolRules } from "../../hooks/use-school-rules.hook";

import { SchoolRulesListStatus } from "./school-rules-list.types";

export const useSchoolRulesList = () => {
  const { data, isPending, isError, isFetching, refetch } = useSchoolRules();
  const rules = data?.rules ?? [];
  const status: SchoolRulesListStatus = isError
    ? "error"
    : isPending
      ? "loading"
      : rules.length === 0
        ? "empty"
        : "ready";

  return {
    status,
    rules,
    retrying: isFetching,
    retry: () => void refetch(),
  };
};
