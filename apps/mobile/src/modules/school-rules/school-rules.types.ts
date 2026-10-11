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
