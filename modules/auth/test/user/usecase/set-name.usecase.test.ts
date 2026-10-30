import {
  ForbiddenError,
  UnauthorizedError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SetName, User, UserStatus } from "../../../src";
import { FakeRulesVersionProvider, FakeUserRepository } from "../../mock";

const CREATED_AT = new Date("2026-09-01T10:30:00.000Z");

function buildUser(status: UserStatus = "approved"): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappNumber: "+5585999998888",
    whatsappVisible: true,
    role: "student",
    status,
    createdAt: CREATED_AT,
  });
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("SetName", () => {
  const rules = new FakeRulesVersionProvider();

  beforeEach(() => rules.set(0));

  test("saves the trimmed name and changes nothing else", async () => {
    const ana = buildUser();
    const repository = new FakeUserRepository([ana]);
    const useCase = new SetName(repository, rules);

    await expect(
      useCase.execute({ userId: ana.id, name: "  Ana Clara Souza " }),
    ).resolves.toEqual({
      id: ana.id,
      name: "Ana Clara Souza",
      email: "ana@example.com",
      role: "student",
      status: "approved",
      createdAt: CREATED_AT,
      photoUrl: null,
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
      rulesAccepted: true,
      rulesAcceptedBefore: false,
      denialReason: null,
      reactivationStatus: null,
    });

    const saved = await repository.findById(ana.id);
    expect(saved?.name).toBe("Ana Clara Souza");
    expect(saved?.whatsappNumber).toBe("+5585999998888");
  });

  test.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account with user.status.notApproved",
    async (status) => {
      const ana = buildUser(status);
      const repository = new FakeUserRepository([ana]);

      const error = await new SetName(repository, rules)
        .execute({ userId: ana.id, name: "Ana Clara" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error).toMatchObject({ message: "user.status.notApproved", statusCode: 403 });
      expect((await repository.findById(ana.id))?.name).toBe("Ana Souza");
    },
  );

  test("refuses an account that no longer exists with auth.token.invalid", async () => {
    const error = await new SetName(new FakeUserRepository(), rules)
      .execute({ userId: buildUser().id, name: "Ana Clara" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: "auth.token.invalid", statusCode: 401 });
  });

  test.each([undefined, null, 42, "", "   "])(
    "requires a name (%p) and keeps the stored one",
    async (name) => {
      const ana = buildUser();
      const repository = new FakeUserRepository([ana]);

      const messages = await errorsOf(
        new SetName(repository, rules).execute({ userId: ana.id, name: name as never }),
      );

      expect(messages).toEqual(["user.name.required"]);
      expect((await repository.findById(ana.id))?.name).toBe("Ana Souza");
    },
  );

  test.each(["A", "Ana 2", "x".repeat(81)])(
    "refuses the name %p with a user.name.* error and saves nothing",
    async (name) => {
      const ana = buildUser();
      const repository = new FakeUserRepository([ana]);

      const messages = await errorsOf(
        new SetName(repository, rules).execute({ userId: ana.id, name }),
      );

      expect(messages.length).toBeGreaterThan(0);
      messages.forEach((message) => expect(message).toMatch(/^user\.name\./));
      expect((await repository.findById(ana.id))?.name).toBe("Ana Souza");
    },
  );
});
