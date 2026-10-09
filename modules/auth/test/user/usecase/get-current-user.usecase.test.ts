import { UnauthorizedError } from "@rochas-surf-school/shared";
import { GetCurrentUser, User, UserStatus } from "../../../src";
import { FakeUserRepository } from "../../mock";

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
  test("returns the account with its role, status and creation date", async () => {
    const ana = buildUser();
    const useCase = new GetCurrentUser(new FakeUserRepository([ana]));

    await expect(useCase.execute({ id: ana.id })).resolves.toEqual({
      id: ana.id,
      name: "Ana Rocha",
      email: "ana@example.com",
      role: "instructor",
      status: "approved",
      createdAt: CREATED_AT,
    });
  });

  test.each<UserStatus>(["pending", "approved", "denied", "deleted", "removed"])(
    "answers for a %s account",
    async (status) => {
      const ana = buildUser(status);
      const useCase = new GetCurrentUser(new FakeUserRepository([ana]));

      await expect(useCase.execute({ id: ana.id })).resolves.toMatchObject({ status });
    },
  );

  test("refuses an account that no longer exists with auth.token.invalid", async () => {
    const useCase = new GetCurrentUser(new FakeUserRepository());

    const error = await useCase.execute({ id: buildUser().id }).catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: "auth.token.invalid", statusCode: 401 });
  });
});
