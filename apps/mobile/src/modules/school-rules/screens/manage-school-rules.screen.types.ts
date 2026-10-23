import { SchoolRuleSheetMode } from "../components/school-rule-sheet/school-rule-sheet.types";
import { SchoolRule } from "../school-rules.types";

export type ManageSchoolRulesStatus = "loading" | "error" | "empty" | "ready";

/** Which sheet is open: "Nova regra" / "Editar regra", the delete confirmation, or none. */
export type ManageSchoolRulesOpenSheet = "none" | "rule" | "delete";

/** What the add / edit sheet shows; kept after it closes, so it doesn't change while it slides down. */
export type ManageSchoolRulesRuleSheet = {
  mode: SchoolRuleSheetMode;
  rule: SchoolRule | null;
};
