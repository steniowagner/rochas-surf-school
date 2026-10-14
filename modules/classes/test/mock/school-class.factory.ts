import { SchoolClass, SchoolClassState } from "../../src";
import { ADMIN } from "./location.factory";

export const INSTRUCTOR_ID = "7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12";
export const LOCATION_ID = "c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65";

export function buildClass(overrides: Partial<SchoolClassState> = {}): SchoolClass {
  return new SchoolClass({
    discipline: "surf",
    level: "beginner",
    startsAt: new Date("2026-10-15T11:00:00.000Z"),
    endsAt: new Date("2026-10-15T12:00:00.000Z"),
    locationId: LOCATION_ID,
    instructorIds: [INSTRUCTOR_ID],
    capacity: 8,
    createdBy: ADMIN.id,
    ...overrides,
  });
}
