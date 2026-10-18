import { Ionicons } from "@expo/vector-icons";

import type { ClassLocation } from "./classes.types";

export {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

// The character an Ionicons icon renders, to find the icon by text in a test.
export const glyph = (name: keyof typeof Ionicons.glyphMap) =>
  String.fromCodePoint(Number(Ionicons.glyphMap[name]));

/** A saved location with a point in Fortaleza and no upcoming classes. */
export const buildLocation = (overrides: Partial<ClassLocation> = {}): ClassLocation => ({
  id: "l-1",
  name: "Praia do Futuro",
  address: "Av. Zezé Diogo, 5000",
  latitude: -3.7442,
  longitude: -38.4617,
  upcomingClasses: 0,
  ...overrides,
});
