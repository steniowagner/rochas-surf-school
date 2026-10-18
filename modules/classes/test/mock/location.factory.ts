import { ClassActor, Location, LocationState } from "../../src";

export const ADMIN: ClassActor = {
  id: "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34",
  role: "admin",
  status: "approved",
};

export const INSTRUCTOR: ClassActor = {
  id: "7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12",
  role: "instructor",
  status: "approved",
};

export const STUDENT: ClassActor = {
  id: "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25",
  role: "student",
  status: "approved",
};

export function buildLocation(
  name: string,
  address = "Av. Beira Mar, 1",
  overrides: Partial<LocationState> = {},
): Location {
  return new Location({ name, address, latitude: -3.7319, longitude: -38.5267, ...overrides });
}
