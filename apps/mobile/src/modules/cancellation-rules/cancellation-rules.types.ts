export type CancellationDiscipline = "surf" | "skate";

/** `GET` and `PUT /cancellation-rules`: the text of each rule, or null while the school hasn't written it. */
export type CancellationRules = Record<CancellationDiscipline, string | null>;

export type SaveCancellationRuleVariables = {
  discipline: CancellationDiscipline;
  text: string;
};
