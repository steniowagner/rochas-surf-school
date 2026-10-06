import { ValidationException } from "@rochas-surf-school/shared";
import {
  Identity,
  IdentityState,
} from "../../../src/identity/model/identity.entity";

const USER_ID = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildState(overrides: Partial<IdentityState> = {}): IdentityState {
  return {
    userId: USER_ID,
    provider: "google",
    providerUserId: "109876543210987654321",
    ...overrides,
  };
}

function validationMessagesFor(overrides: Partial<IdentityState>): string[] {
  const identity = new Identity(buildState(overrides));
  return getValidationMessages(() => identity.validate());
}

describe("Identity", () => {
  describe("creation", () => {
    it("creates a valid identity with the required fields only", () => {
      const identity = new Identity(buildState());

      expect(identity.id).toEqual(expect.any(String));
      expect(identity.createdAt).toBeInstanceOf(Date);
      expect(identity.deletedAt).toBeNull();
      expect(identity.email).toBeUndefined();
      expect(() => identity.validate()).not.toThrow();
    });

    it("exposes every field through its getter", () => {
      const identity = new Identity(
        buildState({
          provider: "apple",
          providerUserId: "001234.abcd",
          email: "x1y2@privaterelay.appleid.com",
        }),
      );

      expect(identity.userId).toBe(USER_ID);
      expect(identity.provider).toBe("apple");
      expect(identity.providerUserId).toBe("001234.abcd");
      expect(identity.email).toBe("x1y2@privaterelay.appleid.com");
      expect(() => identity.validate()).not.toThrow();
    });

    it("keeps the provided id and timestamps", () => {
      const id = "1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b";
      const createdAt = new Date("2026-01-01T00:00:00Z");

      const identity = new Identity(buildState({ id, createdAt }));

      expect(identity.id).toBe(id);
      expect(identity.createdAt).toEqual(createdAt);
      expect(identity.updatedAt).toEqual(createdAt);
    });
  });

  describe("lazy validation", () => {
    it("can exist with invalid data until validate() is called", () => {
      const identity = new Identity(
        buildState({ userId: "", provider: "github" as never }),
      );

      expect(identity.userId).toBe("");
      expect(() => identity.validate()).toThrow(ValidationException);
    });

    it("reports every missing field at once", () => {
      expect(
        validationMessagesFor({
          userId: "",
          provider: undefined as never,
          providerUserId: " ",
        }),
      ).toEqual([
        "identity.userId.required",
        "identity.provider.required",
        "identity.providerUserId.required",
      ]);
    });
  });

  describe("userId", () => {
    it("rejects a value that is not a uuid", () => {
      expect(validationMessagesFor({ userId: "user-1" })).toEqual([
        "identity.userId.uuid",
      ]);
    });
  });

  describe("provider", () => {
    it.each(["google", "apple", "email"] as const)(
      "accepts %s",
      (provider) => {
        expect(validationMessagesFor({ provider })).toEqual([]);
      },
    );

    it("rejects an unknown provider", () => {
      expect(validationMessagesFor({ provider: "github" as never })).toEqual([
        "identity.provider.in",
      ]);
    });
  });

  describe("providerUserId", () => {
    it("accepts 255 characters and rejects 256", () => {
      expect(validationMessagesFor({ providerUserId: "a".repeat(255) }))
        .toEqual([]);
      expect(validationMessagesFor({ providerUserId: "a".repeat(256) }))
        .toEqual(["identity.providerUserId.max.length"]);
    });
  });

  describe("email", () => {
    it("rejects a malformed email", () => {
      expect(validationMessagesFor({ email: "ana@" })).toEqual([
        "identity.email.invalid.email",
      ]);
    });
  });

  describe("clone", () => {
    it("keeps id and createdAt and updates updatedAt", () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      const identity = new Identity(buildState({ createdAt }));

      const cloned = identity.clone({ email: "ana@example.com" });

      expect(cloned).toBeInstanceOf(Identity);
      expect(cloned.equals(identity)).toBe(true);
      expect(cloned.createdAt).toEqual(createdAt);
      expect(cloned.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
      expect(cloned.email).toBe("ana@example.com");
      expect(identity.email).toBeUndefined();
    });
  });
});
