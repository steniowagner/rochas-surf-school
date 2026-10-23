import { SchoolRule } from "../../school-rules.types";

export type SchoolRuleSheetMode = "add" | "edit";

export type SchoolRuleSheetProps = {
  visible: boolean;
  /** `add` is "Nova regra"; `edit` is "Editar regra" for `rule`, with "Excluir regra". */
  mode: SchoolRuleSheetMode;
  /** The rule being edited; none in `add`. */
  rule?: SchoolRule | null;
  onClose: () => void;
  /** "Excluir regra" of the `edit` mode: the screen swaps this sheet for the delete confirmation. */
  onDelete: (rule: SchoolRule) => void;
};

export type UseSchoolRuleSheetProps = Pick<SchoolRuleSheetProps, "visible" | "mode" | "rule" | "onClose">;

export type SchoolRuleSheetFields = {
  title: string;
  description: string;
};
