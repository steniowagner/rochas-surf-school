import { ValidationException } from "@rochas-surf-school/shared";
import {
  SignInCode,
  SignInCodeState,
  isValidEmail,
  normalizeEmail,
} from "../../../src/sign-in-code/model/sign-in-code.entity";

const HASH = "a".repeat(64);

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildState(overrides: Partial<SignInCodeState> = {}): SignInCodeState {
  return {
    email: "ana@example.com",
    codeHash: HASH,
    expiresAt: new Date("2026-10-07T12:10:00.000Z"),
    lastSentAt: new Date("2026-10-07T12:00:00.000Z"),
    attempts: 0,
    ...overrides,
  };
}

function validationMessagesFor(overrides: Partial<SignInCodeState>): string[] {
  const signInCode = new SignInCode(buildState(overrides));
  return getValidationMessages(() => signInCode.validate());
}

describe("SignInCode", () => {
  describe("creation", () => {
    it("creates a valid code and exposes every field", () => {
      const signInCode = new SignInCode(buildState({ attempts: 3 }));

      expect(signInCode.id).toEqual(expect.any(String));
      expect(signInCode.email).toBe("ana@example.com");
      expect(signInCode.codeHash).toBe(HASH);
      expect(signInCode.expiresAt).toEqual(new Date("2026-10-07T12:10:00.000Z"));
      expect(signInCode.lastSentAt).toEqual(new Date("2026-10-07T12:00:00.000Z"));
      expect(signInCode.attempts).toBe(3);
      expect(signInCode.deletedAt).toBeNull();
      expect(() => signInCode.validate()).not.toThrow();
    });

    it("keeps the provided id and timestamps", () => {
      const id = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";
      const createdAt = new Date("2026-10-01T00:00:00Z");
      const updatedAt = new Date("2026-10-02T00:00:00Z");

      const signInCode = new SignInCode(buildState({ id, createdAt, updatedAt }));

      expect(signInCode.id).toBe(id);
      expect(signInCode.createdAt).toEqual(createdAt);
      expect(signInCode.updatedAt).toEqual(updatedAt);
    });

    it("clones with new values and the same id", () => {
      const signInCode = new SignInCode(buildState());

      const clone = signInCode.clone({ attempts: 1 });

      expect(clone.id).toBe(signInCode.id);
      expect(clone.attempts).toBe(1);
      expect(signInCode.attempts).toBe(0);
    });
  });

  describe("lazy validation", () => {
    it("can exist with invalid data until validate() is called", () => {
      const signInCode = new SignInCode(buildState({ email: "invalid" }));

      expect(signInCode.email).toBe("invalid");
      expect(() => signInCode.validate()).toThrow(ValidationException);
    });

    it("reports every missing field at once", () => {
      expect(
        validationMessagesFor({
          email: "",
          codeHash: "",
          expiresAt: undefined as never,
          lastSentAt: undefined as never,
          attempts: undefined as never,
        }),
      ).toEqual([
        "signInCode.email.required",
        "signInCode.codeHash.required",
        "signInCode.expiresAt.required",
        "signInCode.lastSentAt.required",
        "signInCode.attempts.required",
      ]);
    });
  });

  describe("email", () => {
    it("rejects a malformed email", () => {
      expect(validationMessagesFor({ email: "ana@" })).toEqual([
        "signInCode.email.invalid.email",
      ]);
    });
  });

  describe("codeHash", () => {
    it("accepts 64 lowercase hex characters", () => {
      expect(validationMessagesFor({ codeHash: "0123456789abcdef".repeat(4) })).toEqual([]);
    });

    it("rejects 63 or 65 characters", () => {
      expect(validationMessagesFor({ codeHash: "a".repeat(63) })).toEqual([
        "signInCode.codeHash.regex",
      ]);
      expect(validationMessagesFor({ codeHash: "a".repeat(65) })).toEqual([
        "signInCode.codeHash.regex",
      ]);
    });

    it("rejects characters that are not hex", () => {
      expect(validationMessagesFor({ codeHash: "g".repeat(64) })).toEqual([
        "signInCode.codeHash.regex",
      ]);
    });

    it("rejects the plain 6-digit code", () => {
      expect(validationMessagesFor({ codeHash: "123456" })).toEqual([
        "signInCode.codeHash.regex",
      ]);
    });
  });

  describe("dates", () => {
    it("rejects invalid dates", () => {
      expect(
        validationMessagesFor({
          expiresAt: new Date("invalid"),
          lastSentAt: new Date("invalid"),
        }),
      ).toEqual([
        "signInCode.expiresAt.invalid.date",
        "signInCode.lastSentAt.invalid.date",
      ]);
    });
  });

  describe("attempts", () => {
    it("accepts zero", () => {
      expect(validationMessagesFor({ attempts: 0 })).toEqual([]);
    });

    it("rejects negative numbers", () => {
      expect(validationMessagesFor({ attempts: -1 })).toEqual([
        "signInCode.attempts.min.value",
      ]);
    });

    it("rejects fractions", () => {
      expect(validationMessagesFor({ attempts: 1.5 })).toEqual([
        "signInCode.attempts.integer",
      ]);
    });
  });

  describe("email helpers", () => {
    it("normalizes by trimming and lowercasing", () => {
      expect(normalizeEmail(" Ana@Example.COM ")).toBe("ana@example.com");
    });

    it("normalizes anything that is not a string to an empty string", () => {
      expect(normalizeEmail(undefined)).toBe("");
      expect(normalizeEmail(42)).toBe("");
    });

    it("accepts a valid email and rejects an empty or malformed one", () => {
      expect(isValidEmail("ana@example.com")).toBe(true);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("ana@")).toBe(false);
    });
  });
});
