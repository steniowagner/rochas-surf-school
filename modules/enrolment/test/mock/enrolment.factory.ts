import { ClassActor } from "@rochas-surf-school/classes";
import { Enrolment, EnrolmentClass, EnrolmentState } from "../../src";

export const STUDENT: ClassActor = {
  id: "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25",
  role: "student",
  status: "approved",
};

export const INSTRUCTOR: ClassActor = {
  id: "7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12",
  role: "instructor",
  status: "approved",
};

export const ADMIN: ClassActor = {
  id: "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34",
  role: "admin",
  status: "approved",
};

export const CLASS_ID = "3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
export const NOW = new Date("2026-10-18T12:00:00.000Z");
export const TOMORROW = new Date("2026-10-19T11:00:00.000Z");

export function buildEnrolment(overrides: Partial<EnrolmentState> = {}): Enrolment {
  return new Enrolment({
    classId: CLASS_ID,
    studentId: STUDENT.id,
    status: "pending",
    requestedAt: NOW,
    ...overrides,
  });
}

export function buildEnrolmentClass(overrides: Partial<EnrolmentClass> = {}): EnrolmentClass {
  return {
    id: CLASS_ID,
    discipline: "surf",
    startsAt: TOMORROW,
    endsAt: new Date(TOMORROW.getTime() + 60 * 60 * 1000),
    capacity: 8,
    cancelledAt: null,
    instructorIds: [INSTRUCTOR.id],
    hasCancellationRule: true,
    ...overrides,
  };
}
