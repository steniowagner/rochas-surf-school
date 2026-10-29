import type { Locale } from "@/i18n/locales";

/** `empty`: the form as it opens; `filled`: a batch ready to create; `timeSheet`: "Novo horário" over the empty form. */
export type NewClassState = "empty" | "filled" | "timeSheet";

export type NewClassScreenProps = {
  locale: Locale;
  state: NewClassState;
  /** The notes the school typed (spec 072 D-04): not app copy. */
  notes: string;
};
