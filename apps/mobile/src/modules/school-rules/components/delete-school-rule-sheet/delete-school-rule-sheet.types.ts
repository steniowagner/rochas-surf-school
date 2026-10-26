import { SchoolRule } from "../../school-rules.types";

export type DeleteSchoolRuleSheetProps = {
  visible: boolean;
  /** The rule to delete; its title is shown. */
  rule: SchoolRule | null;
  /** "Cancelar", a drag or a backdrop tap, and the end of a deletion: the screen closes the sheet. */
  onClose: () => void;
};

export type UseDeleteSchoolRuleSheetProps = Pick<DeleteSchoolRuleSheetProps, "rule" | "onClose">;
