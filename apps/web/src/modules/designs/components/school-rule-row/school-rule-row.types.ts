export type SchoolRuleRowProps = {
  rule: { title: string; description: string };
  /** 1-based position in the list; shown as "01", "02"… */
  position: number;
  showDivider: boolean;
};
