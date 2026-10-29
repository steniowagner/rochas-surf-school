import type { Locale } from "@/i18n/locales";

export type SchoolRuleEditableRowProps = {
  locale: Locale;
  rule: { title: string; description: string };
  /** 1-based position in the list; shown as "01", "02"… */
  position: number;
  showDivider: boolean;
  /** The first rule can't go up. */
  moveUpDisabled: boolean;
  /** The last rule can't go down. */
  moveDownDisabled: boolean;
};
