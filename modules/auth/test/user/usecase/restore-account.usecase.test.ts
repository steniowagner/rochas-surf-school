import { ConflictError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { RestoreAccount, User, UserState } from "../../../src";
import { FakeAccountRemovalNotifier, FakeClockProvider, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-30T12:00:00.000Z");
const ADMIN = { id: "admin-id", role: "admin", status: "approved" } as const;
const UNKNOWN_ID = "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10";
const DAY = 24 * 60 * 60 * 1000;

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappNumber: "+5585999990000",
    whatsappVisible: true,
    role: "instructor",
    status: "removed",
    removedAt: new Date(NOW.getTime() - 3 * DAY),
    rulesAcceptances: [{ version: 1, acceptedAt: new Date("2026-09-01T10:00:00.000Z") }],
    ...overrides,
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const updateIfRemoved = jest.spyOn(repository, "updateIfRemoved");
  const notifier = new FakeAccountRemovalNotifier();
  const useCase = new RestoreAccount(repository, new FakeClockProvider(NOW), notifier);

  return { repository, updateIfRemoved, notifier, useCase };
}

describe("RestoreAccount", () => {
  test("brings the account back with its role and history, and tells the person", async () => {
    const ana = buildUser();
    const { repository, notifier, useCase } = setup(ana);

    await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).resolves.toEqual({
      id: ana.id,
      status: "approved",
    });

    const stored = await repository.findById(ana.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.removedAt).toBeUndefined();
    expect(stored?.role).toBe("instructor");
    expect(stored?.name).toBe("Ana Souza");
    expect(stored?.whatsappNumber).toBe("+5585999990000");
    expect(stored?.whatsappVisible).toBe(true);
    expect(stored?.rulesAcceptances).toHaveLength(1);
    expect(notifier.restored).toEqual([ana.id]);
    expect(notifier.removed).toEqual([]);
  });

  test("restores an account removed just under 30 days ago", async () => {
    const ana = buildUser({ removedAt: new Date(NOW.getTime() - 30 * DAY + 1) });
    const { useCase } = setup(ana);

    await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).resolves.toEqual({
      id: ana.id,
      status: "approved",
    });
  });

  test("answers the same when the notifier fails", async () => {
    const ana = buildUser();
    const { notifier, useCase } = setup(ana);
    notifier.failWith = new Error("push down");

    await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).resolves.toEqual({
      id: ana.id,
      status: "approved",
    });
  });

  test("loses the race to another restore: 409 and no notification", async () => {
    const ana = buildUser();
    const { updateIfRemoved, notifier, useCase } = setup(ana);
    updateIfRemoved.mockResolvedValue(false);

    await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).rejects.toThrow(
      new ConflictError("user.status.notRemoved"),
    );
    expect(notifier.restored).toEqual([]);
  });

  describe("refuses", () => {
    test("a caller that isn't approved", async () => {
      const ana = buildUser();
      const { useCase } = setup(ana);

      await expect(
        useCase.execute({ actor: { ...ADMIN, status: "deleted" }, userId: ana.id }),
      ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    });

    test("an approved non-admin", async () => {
      const ana = buildUser();
      const { useCase } = setup(ana);

      await expect(
        useCase.execute({ actor: { ...ADMIN, role: "student" }, userId: ana.id }),
      ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    });

    test.each(["not-a-uuid", UNKNOWN_ID])("the id %s, which names no one", async (userId) => {
      const { useCase } = setup();

      await expect(useCase.execute({ actor: ADMIN, userId })).rejects.toThrow(
        new NotFoundError("user.notFound"),
      );
    });

    test.each(["approved", "pending", "denied", "deleted"] as const)(
      "a %s account",
      async (status) => {
        const ana = buildUser({ status, removedAt: undefined });
        const { repository, notifier, useCase } = setup(ana);

        await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).rejects.toThrow(
          new ConflictError("user.status.notRemoved"),
        );
        expect((await repository.findById(ana.id))?.status).toBe(status);
        expect(notifier.restored).toEqual([]);
      },
    );

    test.each([30 * DAY, 31 * DAY])("an account removed %d ms ago", async (age) => {
      const ana = buildUser({ removedAt: new Date(NOW.getTime() - age) });
      const { repository, updateIfRemoved, notifier, useCase } = setup(ana);

      await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).rejects.toThrow(
        new ConflictError("removal.window.ended"),
      );
      expect((await repository.findById(ana.id))?.status).toBe("removed");
      expect(updateIfRemoved).not.toHaveBeenCalled();
      expect(notifier.restored).toEqual([]);
    });

    test("a removed account with no removal date", async () => {
      const ana = buildUser({ removedAt: undefined });
      const { useCase } = setup(ana);

      await expect(useCase.execute({ actor: ADMIN, userId: ana.id })).rejects.toThrow(
        new ConflictError("removal.window.ended"),
      );
    });
  });
});
