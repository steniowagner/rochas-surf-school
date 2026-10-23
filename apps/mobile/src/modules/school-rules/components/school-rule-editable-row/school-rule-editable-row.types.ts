import { SchoolRule } from "../../school-rules.types";

export type SchoolRuleEditableRowProps = {
  rule: SchoolRule;
  /** 1-based position in the list; shown as "01", "02"… */
  position: number;
  showDivider: boolean;
  /** The first rule can't go up; no arrow works while a reorder is in flight. */
  moveUpDisabled: boolean;
  /** The last rule can't go down; no arrow works while a reorder is in flight. */
  moveDownDisabled: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};
