import { SchoolRule } from "../model";

export interface SchoolRuleOut {
  id: string;
  title: string;
  description: string;
  index: number;
}

export interface SchoolRulesOut {
  version: number;
  rules: SchoolRuleOut[];
}

export function toSchoolRulesOut(
  version: number,
  rules: SchoolRule[],
): SchoolRulesOut {
  return {
    version,
    rules: rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      index: rule.index,
    })),
  };
}
