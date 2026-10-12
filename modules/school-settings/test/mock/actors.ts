import { SchoolSettingsActor } from "../../src";

export const ADMIN: SchoolSettingsActor = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "admin",
  status: "approved",
};

export const INSTRUCTOR: SchoolSettingsActor = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "instructor",
  status: "approved",
};

export const STUDENT: SchoolSettingsActor = {
  id: "33333333-3333-4333-8333-333333333333",
  role: "student",
  status: "approved",
};

export const NOT_APPROVED_STATUSES = [
  "pending",
  "denied",
  "deleted",
  "removed",
] as const;
