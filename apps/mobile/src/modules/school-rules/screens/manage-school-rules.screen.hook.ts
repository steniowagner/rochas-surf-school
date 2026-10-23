import { useState } from "react";

import { useReorderSchoolRules } from "../hooks/use-reorder-school-rules.hook";
import { useSchoolRules } from "../hooks/use-school-rules.hook";
import { SchoolRule } from "../school-rules.types";

import {
  ManageSchoolRulesOpenSheet,
  ManageSchoolRulesRuleSheet,
  ManageSchoolRulesStatus,
} from "./manage-school-rules.screen.types";

export const useManageSchoolRulesScreen = () => {
  const query = useSchoolRules();
  const reorder = useReorderSchoolRules();
  const [openSheet, setOpenSheet] = useState<ManageSchoolRulesOpenSheet>("none");
  const [ruleSheet, setRuleSheet] = useState<ManageSchoolRulesRuleSheet>({ mode: "add", rule: null });
  const [ruleToDelete, setRuleToDelete] = useState<SchoolRule | null>(null);

  const rules = query.data?.rules ?? [];
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: ManageSchoolRulesStatus = query.data
    ? rules.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  // One place at a time: the arrows are off while a reorder is in flight (spec 056, D-05).
  const move = (index: number, offset: -1 | 1) => {
    const next = [...rules];
    const [rule] = next.splice(index, 1);

    next.splice(index + offset, 0, rule);
    reorder.mutate({ rules: next });
  };

  return {
    status,
    rules,
    retrying: query.isFetching,
    reordering: reorder.isPending,
    retry: () => void query.refetch(),
    moveUp: (index: number) => move(index, -1),
    moveDown: (index: number) => move(index, 1),
    ruleSheetVisible: openSheet === "rule",
    ruleSheet,
    deleteSheetVisible: openSheet === "delete",
    ruleToDelete,
    openAdd: () => {
      setRuleSheet({ mode: "add", rule: null });
      setOpenSheet("rule");
    },
    openEdit: (rule: SchoolRule) => {
      setRuleSheet({ mode: "edit", rule });
      setOpenSheet("rule");
    },
    // The edit sheet reports its dismissal after it gave way to the delete confirmation: that must not close the
    // confirmation.
    closeRuleSheet: () => setOpenSheet((current) => (current === "rule" ? "none" : current)),
    // "Excluir regra" swaps the edit sheet for the confirmation; the edit sheet doesn't come back (spec 056, D-04).
    openDelete: (rule: SchoolRule) => {
      setRuleToDelete(rule);
      setOpenSheet("delete");
    },
    closeDeleteSheet: () => setOpenSheet("none"),
  };
};
