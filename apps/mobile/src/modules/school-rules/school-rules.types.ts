/** A school rule as `GET /school-rules` returns it; the text is shown as the admins wrote it. */
export type SchoolRule = {
  id: string;
  title: string;
  description: string;
  index: number;
};

export type SchoolRules = {
  // 0 while the school has never had rules.
  version: number;
  rules: SchoolRule[];
};

/** `POST /school-rules`: the text as typed; the hook trims it. */
export type CreateSchoolRuleVariables = {
  title: string;
  description: string;
};

/** `PUT /school-rules/:id`: the rule and its new text as typed; the hook trims it. */
export type UpdateSchoolRuleVariables = CreateSchoolRuleVariables & {
  id: string;
};

/** `DELETE /school-rules/:id`. */
export type DeleteSchoolRuleVariables = {
  id: string;
};

/** `PUT /school-rules/order`: every current rule, in the new order; the hook sends their ids. */
export type ReorderSchoolRulesVariables = {
  rules: SchoolRule[];
};

/** The list before an optimistic reorder, put back when the request fails. */
export type ReorderSchoolRulesContext = {
  previous: SchoolRules | undefined;
};
