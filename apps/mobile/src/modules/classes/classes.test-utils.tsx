import { Ionicons } from "@expo/vector-icons";

import { hydrateSession } from "@/services/session/session.store";

import type { ClassLocation, ClassStudent } from "./classes.types";

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

/** An approved student with no photo. */
export const buildClassStudent = (overrides: Partial<ClassStudent> = {}): ClassStudent => ({
  id: "s-1",
  name: "Marina Costa",
  photoUrl: null,
  ...overrides,
});

/** Signs the test user in with another role, after `setupSignedInUser`. */
export const signInAs = (role: "student" | "instructor" | "admin", id = "u-1") =>
  hydrateSession({
    user: { id, role, status: "approved" } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
    },
  });
