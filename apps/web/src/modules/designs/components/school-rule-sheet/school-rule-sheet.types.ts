import type { Locale } from "@/i18n/locales";

export type SchoolRuleSheetProps = {
  locale: Locale;
  /** `add` is "Nova regra"; `edit` is "Editar regra" for `rule`, with "Excluir regra". */
  mode: "add" | "edit";
  /** The rule's text; empty fields in `add`. */
  rule?: { title: string; description: string };
};
