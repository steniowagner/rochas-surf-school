import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  DenyRegistration,
  User,
  USER_STATUSES,
  UserStatus,
} from "../../../src";
import { FakeClockProvider, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-12T15:00:00.000Z");
const admin = { id: "admin-id", role: "admin", status: "approved" } as const;

function buildUser(status: UserStatus = "pending"): User {
  return new User({
    name: "Bruno Lima",
    email: "bruno@example.com",
    whatsappVisible: false,
    role: "student",
    status,
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const updateIfPending = jest.spyOn(repository, "updateIfPending");
  const useCase = new DenyRegistration(repository, new FakeClockProvider(NOW));

  return { repository, updateIfPending, useCase };
}

async function deny(reason: unknown) {
  const bruno = buildUser();
  const { repository, useCase } = setup(bruno);
  const result = await useCase.execute({
    actor: admin,
    registrationId: bruno.id,
    reason,
  });

  return { bruno, result, stored: await repository.findById(bruno.id) };
}

describe("DenyRegistration", () => {
  test("denies with a trimmed reason and the clock's time", async () => {
    const { bruno, result, stored } = await deny("  Não conhecemos você.  ");

    expect(result).toEqual({ id: bruno.id, status: "denied" });
    expect(stored?.status).toBe("denied");
    expect(stored?.denialReason).toBe("Não conhecemos você.");
    expect(stored?.deniedAt).toEqual(NOW);
    expect(stored?.role).toBe("student");
  });

  test.each([undefined, null, "", "   "])(
    "denies without a reason for %p",
    async (reason) => {
      const { stored } = await deny(reason);

      expect(stored?.status).toBe("denied");
      expect(stored?.denialReason).toBeUndefined();
    },
  );

  test("accepts a reason of 500 characters", async () => {
    const { stored } = await deny("a".repeat(500));

    expect(stored?.denialReason).toHaveLength(500);
  });

  test("refuses 501 characters after trimming and writes nothing", async () => {
    const bruno = buildUser();
    const { repository, updateIfPending, useCase } = setup(bruno);

    const error = (await useCase
      .execute({
        actor: admin,
        registrationId: bruno.id,
        reason: ` ${"a".repeat(501)} `,
      })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toContain(
      "user.denialReason.max.length",
    );
    expect(updateIfPending).not.toHaveBeenCalled();
    expect(repository.users[0].status).toBe("pending");
  });

  test("refuses a reason that is not a string", async () => {
    const bruno = buildUser();
    const { repository, useCase } = setup(bruno);

    const error = (await useCase
      .execute({ actor: admin, registrationId: bruno.id, reason: 42 })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual([
      "registration.reason.invalid",
    ]);
    expect(repository.users[0].status).toBe("pending");
  });

  test("refuses a non-admin before looking the user up", async () => {
    const bruno = buildUser();
    const { updateIfPending, useCase } = setup(bruno);

    await expect(
      useCase.execute({
        actor: { id: "i", role: "instructor", status: "approved" },
        registrationId: bruno.id,
      }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    expect(updateIfPending).not.toHaveBeenCalled();
  });

  test("answers not found for unknown and malformed ids", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        actor: admin,
        registrationId: "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10",
      }),
    ).rejects.toThrow(new NotFoundError("registration.notFound"));
    await expect(
      useCase.execute({ actor: admin, registrationId: "abc" }),
    ).rejects.toThrow(new NotFoundError("registration.notFound"));
  });

  test.each(USER_STATUSES.filter((status) => status !== "pending"))(
    "answers conflict for a %s user",
    async (status) => {
      const bruno = buildUser(status);
      const { updateIfPending, useCase } = setup(bruno);

      await expect(
        useCase.execute({
          actor: admin,
          registrationId: bruno.id,
          reason: "x",
        }),
      ).rejects.toThrow(new ConflictError("registration.status.notPending"));
      expect(updateIfPending).not.toHaveBeenCalled();
    },
  );

  test("answers conflict when the user is decided between the read and the write", async () => {
    const bruno = buildUser();
    const { repository, useCase } = setup(bruno);
    const findById = repository.findById.bind(repository);
    jest.spyOn(repository, "findById").mockImplementation(async (id) => {
      const found = await findById(id);
      repository.users[0] = bruno.clone({ status: "approved" });
      return found;
    });

    await expect(
      useCase.execute({ actor: admin, registrationId: bruno.id, reason: "x" }),
    ).rejects.toThrow(new ConflictError("registration.status.notPending"));
    expect(repository.users[0].status).toBe("approved");
    expect(repository.users[0].denialReason).toBeUndefined();
  });
});
