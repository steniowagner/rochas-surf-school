import { ConflictError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { ApproveReactivation, User, UserState } from "../../../src";
import { FakeReactivationNotifier, FakeUserRepository } from "../../mock";

const admin = { id: "admin-id", role: "admin", status: "approved" } as const;
const UNKNOWN_ID = "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10";

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappNumber: "+5585999990000",
    whatsappVisible: true,
    role: "instructor",
    status: "deleted",
    deletedAt: new Date("2026-10-01T08:00:00.000Z"),
    reactivationStatus: "requested",
    reactivationRequestedAt: new Date("2026-10-05T10:00:00.000Z"),
    rulesAcceptances: [{ version: 1, acceptedAt: new Date("2026-09-01T10:00:00.000Z") }],
    ...overrides,
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const updateIfRequested = jest.spyOn(repository, "updateIfReactivationRequested");
  const notifier = new FakeReactivationNotifier();
  const useCase = new ApproveReactivation(repository, notifier);

  return { repository, updateIfRequested, notifier, useCase };
}

describe("ApproveReactivation", () => {
  test("brings the account back with its role and history and clears the request", async () => {
    const ana = buildUser();
    const { repository, notifier, useCase } = setup(ana);

    await expect(useCase.execute({ actor: admin, userId: ana.id })).resolves.toEqual({
      id: ana.id,
      decision: "approved",
    });

    const stored = await repository.findById(ana.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.role).toBe("instructor");
    expect(stored?.name).toBe("Ana Souza");
    expect(stored?.whatsappNumber).toBe("+5585999990000");
    expect(stored?.rulesAcceptances).toHaveLength(1);
    expect(stored?.deletedAt).toBeNull();
    expect(stored?.reactivationStatus).toBeUndefined();
    expect(stored?.reactivationRequestedAt).toBeUndefined();
    expect(notifier.approved).toEqual([ana.id]);
  });

  test("a second deletion can send a new request", async () => {
    const ana = buildUser();
    const { repository, useCase } = setup(ana);

    await useCase.execute({ actor: admin, userId: ana.id });
    const stored = (await repository.findById(ana.id)) as User;

    expect(stored.clone({ status: "deleted" }).reactivationStatus).toBeUndefined();
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
    expect(notifier.approved).toEqual([]);
  });

  test("answers 409 and notifies nobody when the guarded write loses the race", async () => {
    const ana = buildUser();
    const { updateIfRequested, notifier, useCase } = setup(ana);
    updateIfRequested.mockResolvedValueOnce(false);

    await expect(useCase.execute({ actor: admin, userId: ana.id })).rejects.toThrow(
      new ConflictError("reactivation.status.notRequested"),
    );
    expect(notifier.approved).toEqual([]);
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

  test("refuses a pending admin and a non-admin before looking the user up", async () => {
    const ana = buildUser();
    const { updateIfRequested, notifier, useCase } = setup(ana);

    await expect(
      useCase.execute({ actor: { id: "a", role: "admin", status: "pending" }, userId: ana.id }),
    ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    await expect(
      useCase.execute({ actor: { id: "a", role: "student", status: "approved" }, userId: ana.id }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    expect(updateIfRequested).not.toHaveBeenCalled();
    expect(notifier.approved).toEqual([]);
  });
});
