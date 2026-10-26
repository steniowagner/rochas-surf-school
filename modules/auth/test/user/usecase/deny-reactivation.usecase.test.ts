import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { DenyReactivation, User, UserState } from "../../../src";
import { FakeReactivationNotifier, FakeUserRepository } from "../../mock";

const admin = { id: "admin-id", role: "admin", status: "approved" } as const;
const UNKNOWN_ID = "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10";

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "deleted",
    deletedAt: new Date("2026-10-01T08:00:00.000Z"),
    reactivationStatus: "requested",
    reactivationRequestedAt: new Date("2026-10-05T10:00:00.000Z"),
    ...overrides,
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const updateIfRequested = jest.spyOn(repository, "updateIfReactivationRequested");
  const notifier = new FakeReactivationNotifier();
  const useCase = new DenyReactivation(repository, notifier);

  return { repository, updateIfRequested, notifier, useCase };
}

async function deny(reason: unknown) {
  const ana = buildUser();
  const { repository, notifier, useCase } = setup(ana);
  const result = await useCase.execute({ actor: admin, userId: ana.id, reason });

  return { ana, result, notifier, stored: await repository.findById(ana.id) };
}

describe("DenyReactivation", () => {
  test("keeps the account deleted, with the trimmed reason, and tells the person", async () => {
    const { ana, result, notifier, stored } = await deny("  Turmas cheias.  ");

    expect(result).toEqual({ id: ana.id, decision: "denied" });
    expect(stored?.status).toBe("deleted");
    expect(stored?.reactivationStatus).toBe("denied");
    expect(stored?.denialReason).toBe("Turmas cheias.");
    expect(notifier.denied).toEqual([{ userId: ana.id, reason: "Turmas cheias." }]);
  });

  test.each([undefined, null, "", "   "])("denies without a reason for %p", async (reason) => {
    const { ana, notifier, stored } = await deny(reason);

    expect(stored?.reactivationStatus).toBe("denied");
    expect(stored?.denialReason).toBeUndefined();
    expect(notifier.denied).toEqual([{ userId: ana.id, reason: undefined }]);
  });

  test("accepts a reason of 500 characters", async () => {
    const { stored } = await deny("a".repeat(500));

    expect(stored?.denialReason).toHaveLength(500);
  });

  test("refuses 501 characters after trimming and changes nothing", async () => {
    const ana = buildUser();
    const { repository, updateIfRequested, notifier, useCase } = setup(ana);

    const error = (await useCase
      .execute({ actor: admin, userId: ana.id, reason: ` ${"a".repeat(501)} ` })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toContain("user.denialReason.max.length");
    expect(updateIfRequested).not.toHaveBeenCalled();
    expect(notifier.denied).toEqual([]);
    expect((await repository.findById(ana.id))?.reactivationStatus).toBe("requested");
  });

  test("refuses a reason that is not a string", async () => {
    const ana = buildUser();
    const { repository, useCase } = setup(ana);

    const error = (await useCase
      .execute({ actor: admin, userId: ana.id, reason: 42 })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual(["reactivation.reason.invalid"]);
    expect((await repository.findById(ana.id))?.reactivationStatus).toBe("requested");
  });

  test.each([
    ["an approved account", { status: "approved", reactivationStatus: undefined }],
    ["a removed account", { status: "removed" }],
    ["a deleted account that never asked", { reactivationStatus: undefined }],
    ["an already denied request", { reactivationStatus: "denied" }],
  ] as const)("refuses %s with 409 and notifies nobody", async (_label, overrides) => {
    const ana = buildUser(overrides as Partial<UserState>);
    const { updateIfRequested, notifier, useCase } = setup(ana);

    await expect(useCase.execute({ actor: admin, userId: ana.id })).rejects.toThrow(
      new ConflictError("reactivation.status.notRequested"),
    );
    expect(updateIfRequested).not.toHaveBeenCalled();
    expect(notifier.denied).toEqual([]);
  });

  test("answers 409 and notifies nobody when the guarded write loses the race", async () => {
    const ana = buildUser();
    const { updateIfRequested, notifier, useCase } = setup(ana);
    updateIfRequested.mockResolvedValueOnce(false);

    await expect(useCase.execute({ actor: admin, userId: ana.id })).rejects.toThrow(
      new ConflictError("reactivation.status.notRequested"),
    );
    expect(notifier.denied).toEqual([]);
  });

  test("answers not found for unknown and malformed ids", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ actor: admin, userId: UNKNOWN_ID })).rejects.toThrow(
      new NotFoundError("reactivation.notFound"),
    );
    await expect(useCase.execute({ actor: admin, userId: "abc" })).rejects.toThrow(
      new NotFoundError("reactivation.notFound"),
    );
  });

  test("refuses a pending admin and a non-admin", async () => {
    const ana = buildUser();
    const { updateIfRequested, useCase } = setup(ana);

    await expect(
      useCase.execute({ actor: { id: "a", role: "admin", status: "pending" }, userId: ana.id }),
    ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    await expect(
      useCase.execute({ actor: { id: "a", role: "student", status: "approved" }, userId: ana.id }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    expect(updateIfRequested).not.toHaveBeenCalled();
  });
});
