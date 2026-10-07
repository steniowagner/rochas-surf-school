import { ValidationException } from "@rochas-surf-school/shared";
import {
  RefreshToken,
  RefreshTokenState,
} from "../../../src/session/model/refresh-token.entity";

const USER_ID = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";
const FAMILY_ID = "3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildState(overrides: Partial<RefreshTokenState> = {}): RefreshTokenState {
  return {
    userId: USER_ID,
    tokenHash: "f".repeat(64),
    familyId: FAMILY_ID,
    expiresAt: new Date("2026-11-06T12:00:00.000Z"),
    ...overrides,
  };
}

function validationMessagesFor(overrides: Partial<RefreshTokenState>): string[] {
  const token = new RefreshToken(buildState(overrides));
  return getValidationMessages(() => token.validate());
}

describe("RefreshToken", () => {
  it("creates a valid token and exposes every field", () => {
    const revokedAt = new Date("2026-10-08T12:00:00.000Z");
    const token = new RefreshToken(buildState({ revokedAt }));

    expect(token.id).toEqual(expect.any(String));
    expect(token.userId).toBe(USER_ID);
    expect(token.tokenHash).toBe("f".repeat(64));
    expect(token.familyId).toBe(FAMILY_ID);
    expect(token.expiresAt).toEqual(new Date("2026-11-06T12:00:00.000Z"));
    expect(token.revokedAt).toEqual(revokedAt);
    expect(() => token.validate()).not.toThrow();
  });

  it("is not revoked by default", () => {
    expect(new RefreshToken(buildState()).revokedAt).toBeUndefined();
  });

  it("can exist with invalid data until validate() is called", () => {
    const token = new RefreshToken(buildState({ userId: "nope" }));

    expect(token.userId).toBe("nope");
    expect(() => token.validate()).toThrow(ValidationException);
  });

  it("reports every missing field at once", () => {
    expect(
      validationMessagesFor({
        userId: "",
        tokenHash: "",
        familyId: "",
        expiresAt: undefined as never,
      }),
    ).toEqual([
      "refreshToken.userId.required",
      "refreshToken.tokenHash.required",
      "refreshToken.familyId.required",
      "refreshToken.expiresAt.required",
    ]);
  });

  it("rejects ids that are not UUIDs", () => {
    expect(validationMessagesFor({ userId: "user-1", familyId: "family-1" })).toEqual([
      "refreshToken.userId.uuid",
      "refreshToken.familyId.uuid",
    ]);
  });

  it("rejects a hash that is not 64 hex characters", () => {
    expect(validationMessagesFor({ tokenHash: "f".repeat(63) })).toEqual([
      "refreshToken.tokenHash.regex",
    ]);
    expect(validationMessagesFor({ tokenHash: "plain-token" })).toEqual([
      "refreshToken.tokenHash.regex",
    ]);
  });

  it("rejects invalid dates", () => {
    expect(
      validationMessagesFor({
        expiresAt: new Date("invalid"),
        revokedAt: new Date("invalid"),
      }),
    ).toEqual(["refreshToken.expiresAt.invalid.date", "refreshToken.revokedAt.invalid.date"]);
  });
});
