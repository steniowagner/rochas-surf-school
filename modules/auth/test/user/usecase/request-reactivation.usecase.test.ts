import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "@rochas-surf-school/shared";
import {
  RequestReactivation,
  User,
  UserReactivationStatus,
  UserRole,
  UserStatus,
} from "../../../src";
import {
  FakeClockProvider,
  FakeRulesVersionProvider,
  FakeUserRepository,
} from "../../mock";

const CREATED_AT = new Date("2026-09-01T10:30:00.000Z");
const NOW = new Date("2026-10-11T09:00:00.000Z");

function buildUser(
  status: UserStatus = "deleted",
  overrides: {
    role?: UserRole;
    reactivationStatus?: UserReactivationStatus;
    reactivationRequestedAt?: Date;
  } = {},
): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status,
    createdAt: CREATED_AT,
    ...overrides,
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const rules = new FakeRulesVersionProvider();
  rules.set(0);
  const clock = new FakeClockProvider(NOW);
  const update = jest.spyOn(repository, "update");
  const useCase = new RequestReactivation(repository, rules, clock);

  return { repository, update, useCase };
}

describe("RequestReactivation", () => {
  describe("sends the request", () => {
    test.each<UserRole>(["student", "instructor", "admin"])(
      "stores the request of a deleted %s and answers the account",
      async (role) => {
        const ana = buildUser("deleted", { role });
        const { repository, update, useCase } = setup(ana);

        await expect(useCase.execute({ userId: ana.id })).resolves.toEqual({
          id: ana.id,
          name: "Ana Rocha",
          email: "ana@example.com",
          role,
          status: "deleted",
          createdAt: CREATED_AT,
          whatsappNumber: null,
          whatsappVisible: false,
          rulesAccepted: true,
          rulesAcceptedBefore: false,
          denialReason: null,
          reactivationStatus: "requested",
        });

        expect(update).toHaveBeenCalledTimes(1);
        const saved = await repository.findById(ana.id);
        expect(saved?.status).toBe("deleted");
        expect(saved?.reactivationStatus).toBe("requested");
        expect(saved?.reactivationRequestedAt).toEqual(NOW);
      },
    );
  });

  test("already requested: answers the account, writes nothing and keeps the first date", async () => {
    const first = new Date("2026-10-01T08:00:00.000Z");
    const ana = buildUser("deleted", {
      reactivationStatus: "requested",
      reactivationRequestedAt: first,
    });
    const { repository, update, useCase } = setup(ana);

    const out = await useCase.execute({ userId: ana.id });

    expect(out).toMatchObject({ status: "deleted", reactivationStatus: "requested" });
    expect(update).not.toHaveBeenCalled();
    const saved = await repository.findById(ana.id);
    expect(saved?.reactivationRequestedAt).toEqual(first);
  });

  test("denied: refuses with 409 and writes nothing", async () => {
    const ana = buildUser("deleted", { reactivationStatus: "denied" });
    const { repository, update, useCase } = setup(ana);

    const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe("user.reactivation.denied");
    expect(update).not.toHaveBeenCalled();
    expect((await repository.findById(ana.id))?.reactivationStatus).toBe("denied");
  });

  describe("not deleted", () => {
    test.each<UserStatus>(["pending", "approved", "denied", "removed"])(
      "refuses a %s account with 403 and writes nothing",
      async (status) => {
        const ana = buildUser(status);
        const { update, useCase } = setup(ana);

        const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.message).toBe("user.status.notDeleted");
        expect(update).not.toHaveBeenCalled();
      },
    );

    test("checks the status before a denied reactivation status", async () => {
      const ana = buildUser("removed", { reactivationStatus: "denied" });
      const { update, useCase } = setup(ana);

      const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notDeleted");
      expect(update).not.toHaveBeenCalled();
    });
  });

  test("unknown account: refuses with 401", async () => {
    const { update, useCase } = setup();

    const error = await useCase
      .execute({ userId: "3f1c2a7e-0d4b-4c4e-9a51-6f0e2b9d8c11" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe("auth.token.invalid");
    expect(update).not.toHaveBeenCalled();
  });
});
