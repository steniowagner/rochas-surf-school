import { toAccountOut, User } from "../../../src";

const CREATED_AT = new Date("2026-09-01T10:30:00.000Z");

function buildUser(versions: number[] = []): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "approved",
    createdAt: CREATED_AT,
    rulesAcceptances: versions.map((version) => ({
      version,
      acceptedAt: new Date("2026-10-01T10:00:00.000Z"),
    })),
  });
}

describe("toAccountOut", () => {
  test("shapes the account", () => {
    const ana = buildUser();

    expect(toAccountOut(ana, 0)).toEqual({
      id: ana.id,
      name: "Ana Rocha",
      email: "ana@example.com",
      role: "student",
      status: "approved",
      createdAt: CREATED_AT,
      whatsappNumber: null,
      whatsappVisible: false,
      rulesAccepted: true,
      rulesAcceptedBefore: false,
      denialReason: null,
      reactivationStatus: null,
    });
  });

  test("keeps the WhatsApp number", () => {
    const ana = new User({
      name: "Ana Rocha",
      email: "ana@example.com",
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
      role: "student",
      status: "approved",
    });

    expect(toAccountOut(ana, 0)).toMatchObject({
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
    });
  });

  test("needs no acceptance while the version is 0", () => {
    expect(toAccountOut(buildUser(), 0).rulesAccepted).toBe(true);
  });

  test("is accepted when the current version was accepted", () => {
    expect(toAccountOut(buildUser([1, 3]), 3).rulesAccepted).toBe(true);
  });

  test("is not accepted when only an older version was", () => {
    expect(toAccountOut(buildUser([1, 2]), 3).rulesAccepted).toBe(false);
  });

  test("is not accepted when nothing was accepted", () => {
    expect(toAccountOut(buildUser(), 3).rulesAccepted).toBe(false);
  });

  test("has no earlier acceptance without acceptances, whatever the version", () => {
    expect(toAccountOut(buildUser(), 0).rulesAcceptedBefore).toBe(false);
    expect(toAccountOut(buildUser(), 3).rulesAcceptedBefore).toBe(false);
  });

  test("has an earlier acceptance with the current version accepted", () => {
    expect(toAccountOut(buildUser([3]), 3).rulesAcceptedBefore).toBe(true);
  });

  test("has an earlier acceptance with only an older version accepted", () => {
    expect(toAccountOut(buildUser([1]), 3)).toMatchObject({
      rulesAccepted: false,
      rulesAcceptedBefore: true,
    });
  });

  test("keeps the denial reason of a denied account", () => {
    const ana = buildUser().clone({
      status: "denied",
      denialReason: "Unknown person",
    });

    expect(toAccountOut(ana, 0)).toMatchObject({
      status: "denied",
      denialReason: "Unknown person",
      reactivationStatus: null,
    });
  });

  test("has no denial reason when a denied account got none", () => {
    const ana = buildUser().clone({ status: "denied" });

    expect(toAccountOut(ana, 0).denialReason).toBeNull();
  });

  test.each(["requested", "denied"] as const)(
    "keeps the %s reactivation status of a deleted account",
    (reactivationStatus) => {
      const ana = buildUser().clone({ status: "deleted", reactivationStatus });

      expect(toAccountOut(ana, 0)).toMatchObject({
        status: "deleted",
        denialReason: null,
        reactivationStatus,
      });
    },
  );

  test("never returns the closed-account dates", () => {
    const ana = buildUser().clone({
      status: "deleted",
      deniedAt: new Date("2026-09-02T10:00:00.000Z"),
      removedAt: new Date("2026-09-03T10:00:00.000Z"),
      deletedAt: new Date("2026-09-04T10:00:00.000Z"),
      reactivationStatus: "requested",
      reactivationRequestedAt: new Date("2026-09-05T10:00:00.000Z"),
    });

    const out = toAccountOut(ana, 0);

    expect(out).not.toHaveProperty("deniedAt");
    expect(out).not.toHaveProperty("removedAt");
    expect(out).not.toHaveProperty("deletedAt");
    expect(out).not.toHaveProperty("reactivationRequestedAt");
  });
});
