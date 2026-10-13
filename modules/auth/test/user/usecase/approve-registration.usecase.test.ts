import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@rochas-surf-school/shared";
import {
  ApproveRegistration,
  User,
  USER_STATUSES,
  UserStatus,
} from "../../../src";
import { FakeRegistrationNotifier, FakeUserRepository } from "../../mock";

const admin = { id: "admin-id", role: "admin", status: "approved" } as const;

function buildUser(status: UserStatus = "pending"): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "instructor",
    status,
    whatsappNumber: "+5585999999999",
  });
}

function setup(user?: User) {
  const repository = new FakeUserRepository(user ? [user] : []);
  const updateIfPending = jest.spyOn(repository, "updateIfPending");
  const notifier = new FakeRegistrationNotifier();

  return {
    repository,
    updateIfPending,
    notifier,
    useCase: new ApproveRegistration(repository, notifier),
  };
}

describe("ApproveRegistration", () => {
  test("approves a pending user and changes only the status", async () => {
    const ana = buildUser();
    const { repository, notifier, useCase } = setup(ana);

    await expect(
      useCase.execute({ actor: admin, registrationId: ana.id }),
    ).resolves.toEqual({ id: ana.id, status: "approved" });
    expect(notifier.approved).toEqual([ana.id]);

    const stored = await repository.findById(ana.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.role).toBe("instructor");
    expect(stored?.whatsappNumber).toBe("+5585999999999");
    expect(stored?.denialReason).toBeUndefined();
    expect(stored?.deniedAt).toBeUndefined();
  });

  test("refuses a non-admin before looking the user up", async () => {
    const ana = buildUser();
    const { repository, updateIfPending, useCase } = setup(ana);
    const findById = jest.spyOn(repository, "findById");

    await expect(
      useCase.execute({
        actor: { id: "s", role: "student", status: "approved" },
        registrationId: ana.id,
      }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    expect(findById).not.toHaveBeenCalled();
    expect(updateIfPending).not.toHaveBeenCalled();
  });

  test("answers not found for an unknown id", async () => {
    const { updateIfPending, useCase } = setup();

    await expect(
      useCase.execute({
        actor: admin,
        registrationId: "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10",
      }),
    ).rejects.toThrow(new NotFoundError("registration.notFound"));
    expect(updateIfPending).not.toHaveBeenCalled();
  });

  test("answers not found for a malformed id without a lookup", async () => {
    const { repository, useCase } = setup();
    const findById = jest.spyOn(repository, "findById");

    await expect(
      useCase.execute({ actor: admin, registrationId: "abc" }),
    ).rejects.toThrow(new NotFoundError("registration.notFound"));
    expect(findById).not.toHaveBeenCalled();
  });

  test.each(USER_STATUSES.filter((status) => status !== "pending"))(
    "answers conflict for a %s user and writes nothing",
    async (status) => {
      const ana = buildUser(status);
      const { updateIfPending, useCase } = setup(ana);

      await expect(
        useCase.execute({ actor: admin, registrationId: ana.id }),
      ).rejects.toThrow(new ConflictError("registration.status.notPending"));
      expect(updateIfPending).not.toHaveBeenCalled();
    },
  );

  test("answers conflict when the user is decided between the read and the write", async () => {
    const ana = buildUser();
    const { repository, useCase } = setup(ana);
    const findById = repository.findById.bind(repository);
    jest.spyOn(repository, "findById").mockImplementation(async (id) => {
      const found = await findById(id);
      repository.users[0] = ana.clone({ status: "denied" });
      return found;
    });

    await expect(
      useCase.execute({ actor: admin, registrationId: ana.id }),
    ).rejects.toThrow(new ConflictError("registration.status.notPending"));
    expect(repository.users[0].status).toBe("denied");
  });

  test("tells nobody when the approval is refused, not found or lost", async () => {
    const ana = buildUser();
    const { repository, notifier, useCase } = setup(ana);

    await expect(
      useCase.execute({
        actor: { id: "s", role: "student", status: "approved" },
        registrationId: ana.id,
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      useCase.execute({ actor: admin, registrationId: "abc" }),
    ).rejects.toThrow(NotFoundError);
    const findById = repository.findById.bind(repository);
    jest.spyOn(repository, "findById").mockImplementation(async (id) => {
      const found = await findById(id);
      repository.users[0] = ana.clone({ status: "denied" });
      return found;
    });
    await expect(
      useCase.execute({ actor: admin, registrationId: ana.id }),
    ).rejects.toThrow(ConflictError);

    expect(notifier.approved).toEqual([]);
  });
});
