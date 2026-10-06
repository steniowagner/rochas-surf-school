import { ValidationException } from "@rochas-surf-school/shared";
import { User, UserState } from "../../../src/user/model/user.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildState(overrides: Partial<UserState> = {}): UserState {
  return {
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "pending",
    ...overrides,
  };
}

function validationMessagesFor(overrides: Partial<UserState>): string[] {
  const user = new User(buildState(overrides));
  return getValidationMessages(() => user.validate());
}

describe("User", () => {
  describe("creation", () => {
    it("creates a valid user with the required fields only", () => {
      const user = new User(buildState());

      expect(user.id).toEqual(expect.any(String));
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBe(user.createdAt.getTime());
      expect(user.deletedAt).toBeNull();
      expect(() => user.validate()).not.toThrow();
    });

    it("exposes every field through its getter", () => {
      const deniedAt = new Date("2026-01-10T10:00:00Z");
      const removedAt = new Date("2026-02-10T10:00:00Z");
      const rulesAcceptances = [
        { version: 1, acceptedAt: new Date("2026-03-10T10:00:00Z") },
        { version: 2, acceptedAt: new Date("2026-04-01T10:00:00Z") },
      ];
      const deletedAt = new Date("2026-04-10T10:00:00Z");

      const user = new User(
        buildState({
          photoUrl: "https://cdn.example.com/ana.jpg",
          whatsappNumber: "+5585999998888",
          whatsappVisible: true,
          role: "admin",
          status: "deleted",
          denialReason: "Unknown person",
          deniedAt,
          removedAt,
          reactivationStatus: "requested",
          rulesAcceptances,
          deletedAt,
        }),
      );

      expect(user.name).toBe("Ana Rocha");
      expect(user.email).toBe("ana@example.com");
      expect(user.photoUrl).toBe("https://cdn.example.com/ana.jpg");
      expect(user.whatsappNumber).toBe("+5585999998888");
      expect(user.whatsappVisible).toBe(true);
      expect(user.role).toBe("admin");
      expect(user.status).toBe("deleted");
      expect(user.denialReason).toBe("Unknown person");
      expect(user.deniedAt).toEqual(deniedAt);
      expect(user.removedAt).toEqual(removedAt);
      expect(user.reactivationStatus).toBe("requested");
      expect(user.rulesAcceptances).toEqual(rulesAcceptances);
      expect(user.deletedAt).toEqual(deletedAt);
      expect(() => user.validate()).not.toThrow();
    });

    it("leaves the optional fields undefined", () => {
      const user = new User(buildState());

      expect(user.photoUrl).toBeUndefined();
      expect(user.whatsappNumber).toBeUndefined();
      expect(user.denialReason).toBeUndefined();
      expect(user.deniedAt).toBeUndefined();
      expect(user.removedAt).toBeUndefined();
      expect(user.reactivationStatus).toBeUndefined();
      expect(user.rulesAcceptances).toEqual([]);
    });

    it("keeps the provided id and timestamps", () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      const updatedAt = new Date("2026-01-02T00:00:00Z");
      const id = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";

      const user = new User(buildState({ id, createdAt, updatedAt }));

      expect(user.id).toBe(id);
      expect(user.createdAt).toEqual(createdAt);
      expect(user.updatedAt).toEqual(updatedAt);
    });

    it("rejects an invalid id in the constructor", () => {
      const messages = getValidationMessages(
        () => new User(buildState({ id: "not-a-uuid" })),
      );

      expect(messages).toContain("id.uuid");
    });
  });

  describe("lazy validation", () => {
    it("can exist with invalid data until validate() is called", () => {
      const user = new User(
        buildState({ name: "", email: "invalid", role: "boss" as never }),
      );

      expect(user.name).toBe("");
      expect(() => user.validate()).toThrow(ValidationException);
    });

    it("reports every invalid field at once", () => {
      const messages = validationMessagesFor({
        name: "",
        email: "",
        whatsappVisible: undefined as never,
        role: undefined as never,
        status: undefined as never,
      });

      expect(messages).toEqual([
        "user.name.required",
        "user.email.required",
        "user.whatsappVisible.required",
        "user.role.required",
        "user.status.required",
      ]);
    });
  });

  describe("name", () => {
    it("requires a first and last name", () => {
      expect(validationMessagesFor({ name: "Ana" })).toEqual([
        "user.name.person.name",
      ]);
    });

    it("accepts accents, hyphens and apostrophes", () => {
      expect(validationMessagesFor({ name: "João D'Ávila-Souza" })).toEqual(
        [],
      );
    });

    it("rejects names shorter than 3 characters", () => {
      expect(validationMessagesFor({ name: "Al" })).toEqual([
        "user.name.min.length",
        "user.name.person.name",
      ]);
    });

    it("accepts 80 characters and rejects 81", () => {
      const base = "Ana ";
      const at80 = base + "a".repeat(80 - base.length);
      const at81 = base + "a".repeat(81 - base.length);

      expect(validationMessagesFor({ name: at80 })).toEqual([]);
      expect(validationMessagesFor({ name: at81 })).toEqual([
        "user.name.max.length",
      ]);
    });

    it("rejects digits", () => {
      expect(validationMessagesFor({ name: "Ana R0cha" })).toEqual([
        "user.name.person.name",
      ]);
    });
  });

  describe("email", () => {
    it("rejects a malformed email", () => {
      expect(validationMessagesFor({ email: "ana@" })).toEqual([
        "user.email.invalid.email",
      ]);
    });
  });

  describe("photoUrl", () => {
    it("accepts an https url", () => {
      expect(
        validationMessagesFor({ photoUrl: "https://cdn.example.com/a.png" }),
      ).toEqual([]);
    });

    it("rejects a non-http url", () => {
      expect(validationMessagesFor({ photoUrl: "ftp://example.com/a.png" }))
        .toEqual(["user.photoUrl.url"]);
    });
  });

  describe("whatsappNumber", () => {
    it("accepts Brazilian and foreign numbers with a country code", () => {
      expect(validationMessagesFor({ whatsappNumber: "+5585999998888" }))
        .toEqual([]);
      expect(validationMessagesFor({ whatsappNumber: "+14155552671" }))
        .toEqual([]);
    });

    it("rejects a number without a country code", () => {
      expect(validationMessagesFor({ whatsappNumber: "85999998888" })).toEqual(
        ["user.whatsappNumber.phone"],
      );
    });
  });

  describe("whatsappVisible", () => {
    it("rejects non-boolean values", () => {
      expect(
        validationMessagesFor({ whatsappVisible: "yes" as never }),
      ).toEqual(["user.whatsappVisible.in"]);
    });
  });

  describe("role", () => {
    it.each(["student", "instructor", "admin"] as const)(
      "accepts %s",
      (role) => {
        expect(validationMessagesFor({ role })).toEqual([]);
      },
    );

    it("rejects an unknown role", () => {
      expect(validationMessagesFor({ role: "owner" as never })).toEqual([
        "user.role.in",
      ]);
    });
  });

  describe("status", () => {
    it.each(["pending", "approved", "denied", "deleted", "removed"] as const)(
      "accepts %s",
      (status) => {
        expect(validationMessagesFor({ status })).toEqual([]);
      },
    );

    it("rejects an unknown status", () => {
      expect(validationMessagesFor({ status: "banned" as never })).toEqual([
        "user.status.in",
      ]);
    });
  });

  describe("denialReason", () => {
    it("accepts 500 characters and rejects 501", () => {
      expect(validationMessagesFor({ denialReason: "a".repeat(500) }))
        .toEqual([]);
      expect(validationMessagesFor({ denialReason: "a".repeat(501) }))
        .toEqual(["user.denialReason.max.length"]);
    });
  });

  describe("reactivationStatus", () => {
    it.each(["requested", "denied"] as const)("accepts %s", (status) => {
      expect(validationMessagesFor({ reactivationStatus: status })).toEqual(
        [],
      );
    });

    it("rejects an unknown reactivation status", () => {
      expect(
        validationMessagesFor({ reactivationStatus: "approved" as never }),
      ).toEqual(["user.reactivationStatus.in"]);
    });
  });

  describe("dates", () => {
    it("rejects invalid dates", () => {
      const invalid = new Date("invalid");

      expect(
        validationMessagesFor({
          deniedAt: invalid,
          removedAt: invalid,
        }),
      ).toEqual([
        "user.deniedAt.invalid.date",
        "user.removedAt.invalid.date",
      ]);
    });
  });

  describe("rulesAcceptances", () => {
    const acceptedAt = new Date("2026-03-10T10:00:00Z");

    it("accepts an empty list", () => {
      expect(validationMessagesFor({ rulesAcceptances: [] })).toEqual([]);
    });

    it("tracks which rule versions were accepted", () => {
      const user = new User(
        buildState({
          rulesAcceptances: [
            { version: 1, acceptedAt },
            { version: 3, acceptedAt },
          ],
        }),
      );

      expect(user.hasAcceptedRules(1)).toBe(true);
      expect(user.hasAcceptedRules(2)).toBe(false);
      expect(user.hasAcceptedRules(3)).toBe(true);
    });

    it("has accepted no version when the list is missing", () => {
      expect(new User(buildState()).hasAcceptedRules(1)).toBe(false);
    });

    it("rejects versions that are not positive integers", () => {
      expect(
        validationMessagesFor({
          rulesAcceptances: [{ version: 1.5, acceptedAt }],
        }),
      ).toEqual(["user.rulesAcceptances.version.integer"]);
      expect(
        validationMessagesFor({
          rulesAcceptances: [{ version: 0, acceptedAt }],
        }),
      ).toEqual(["user.rulesAcceptances.version.positive"]);
    });

    it("rejects the same version accepted twice", () => {
      expect(
        validationMessagesFor({
          rulesAcceptances: [
            { version: 1, acceptedAt },
            { version: 1, acceptedAt },
          ],
        }),
      ).toEqual(["user.rulesAcceptances.version.unique.items"]);
    });

    it("validates the date of every acceptance", () => {
      expect(
        validationMessagesFor({
          rulesAcceptances: [
            { version: 1, acceptedAt },
            { version: 2, acceptedAt: new Date("invalid") },
            { version: 3, acceptedAt: undefined as never },
          ],
        }),
      ).toEqual([
        "user.rulesAcceptances.acceptedAt.invalid.date",
        "user.rulesAcceptances.acceptedAt.required",
      ]);
    });
  });

  describe("clone", () => {
    it("keeps id and createdAt, applies changes and updates updatedAt", () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      const user = new User(buildState({ createdAt }));

      const approved = user.clone({ status: "approved", role: "instructor" });

      expect(approved).toBeInstanceOf(User);
      expect(approved).not.toBe(user);
      expect(approved.id).toBe(user.id);
      expect(approved.equals(user)).toBe(true);
      expect(approved.createdAt).toEqual(createdAt);
      expect(approved.updatedAt.getTime()).toBeGreaterThan(
        createdAt.getTime(),
      );
      expect(approved.status).toBe("approved");
      expect(approved.role).toBe("instructor");
      expect(approved.email).toBe(user.email);
      expect(user.status).toBe("pending");
    });

    it("records a soft delete through deletedAt", () => {
      const deletedAt = new Date("2026-05-01T00:00:00Z");
      const user = new User(buildState({ status: "approved" }));

      const deleted = user.clone({ status: "deleted", deletedAt });

      expect(deleted.deletedAt).toEqual(deletedAt);
      expect(deleted.status).toBe("deleted");
      expect(() => deleted.validate()).not.toThrow();
    });
  });
});
