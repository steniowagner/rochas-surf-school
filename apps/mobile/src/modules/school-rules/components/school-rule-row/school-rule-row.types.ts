import { SchoolRule } from "../../school-rules.types";

export type SchoolRuleRowProps = {
  rule: SchoolRule;
  // 1-based position in the list; shown as "01", "02"…
  position: number;
  showDivider: boolean;
};
