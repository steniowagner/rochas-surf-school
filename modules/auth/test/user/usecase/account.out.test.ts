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
});
