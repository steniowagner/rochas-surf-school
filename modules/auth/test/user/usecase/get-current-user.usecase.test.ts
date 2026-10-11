import { UnauthorizedError } from "@rochas-surf-school/shared";
import { GetCurrentUser, User, UserStatus } from "../../../src";
import { FakeRulesVersionProvider, FakeUserRepository } from "../../mock";

const CREATED_AT = new Date("2026-09-01T10:30:00.000Z");

function buildUser(status: UserStatus = "approved"): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "instructor",
    status,
    createdAt: CREATED_AT,
  });
}

describe("GetCurrentUser", () => {
  const rules = new FakeRulesVersionProvider();

  beforeEach(() => rules.set(0));

  test("returns the account with its role, status and creation date", async () => {
    const ana = buildUser();
    const useCase = new GetCurrentUser(new FakeUserRepository([ana]), rules);

    await expect(useCase.execute({ id: ana.id })).resolves.toEqual({
      id: ana.id,
      name: "Ana Rocha",
      email: "ana@example.com",
      role: "instructor",
      status: "approved",
      createdAt: CREATED_AT,
      whatsappNumber: null,
      whatsappVisible: false,
      rulesAccepted: true,
    });
  });

  test("returns the stored WhatsApp number and visibility", async () => {
    const ana = new User({
      name: "Ana Rocha",
      email: "ana@example.com",
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
      role: "student",
      status: "approved",
    });
    const useCase = new GetCurrentUser(new FakeUserRepository([ana]), rules);

    await expect(useCase.execute({ id: ana.id })).resolves.toMatchObject({
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
    });
  });

  test("says the rules are not accepted when the current version wasn't accepted", async () => {
    rules.set(2);
    const ana = buildUser();
    const useCase = new GetCurrentUser(new FakeUserRepository([ana]), rules);

    await expect(useCase.execute({ id: ana.id })).resolves.toMatchObject({
      rulesAccepted: false,
    });
  });

  test("says the rules are accepted once the current version was", async () => {
    rules.set(2);
    const ana = buildUser();
    const accepted = ana.clone({
      rulesAcceptances: [{ version: 2, acceptedAt: CREATED_AT }],
    });
    const useCase = new GetCurrentUser(new FakeUserRepository([accepted]), rules);

    await expect(useCase.execute({ id: ana.id })).resolves.toMatchObject({
      rulesAccepted: true,
    });
  });

  test.each<UserStatus>(["pending", "approved", "denied", "deleted", "removed"])(
    "answers for a %s account",
    async (status) => {
      const ana = buildUser(status);
      const useCase = new GetCurrentUser(new FakeUserRepository([ana]), rules);

      await expect(useCase.execute({ id: ana.id })).resolves.toMatchObject({ status });
    },
  );

  test("refuses an account that no longer exists with auth.token.invalid", async () => {
    const useCase = new GetCurrentUser(new FakeUserRepository(), rules);

    const error = await useCase.execute({ id: buildUser().id }).catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: "auth.token.invalid", statusCode: 401 });
  });
});
