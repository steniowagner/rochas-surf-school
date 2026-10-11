import { SchoolRule, SchoolRuleActor } from "../../src";

export const ADMIN: SchoolRuleActor = {
  id: "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34",
  role: "admin",
  status: "approved",
};

export const STUDENT: SchoolRuleActor = {
  id: "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25",
  role: "student",
  status: "approved",
};

export function buildRule(title: string, index: number): SchoolRule {
  return new SchoolRule({
    title,
    description: `${title} description`,
    index,
    createdBy: ADMIN.id,
    createdAt: new Date(2026, 0, index),
  });
}
