import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  RegistrationActor,
  SetInstructorFlag,
  User,
  UserRole,
  UserStatus,
} from "../../../src";
import { FakeUserRepository } from "../../mock";

const buildUser = (
  role: UserRole,
  status: UserStatus = "approved",
  name = "Ana Souza",
  isInstructor = false,
) =>
  new User({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    whatsappVisible: false,
    role,
    status,
    isInstructor,
  });

const ADMIN = buildUser("admin", "approved", "Rita Admin");
const ACTOR: RegistrationActor = { id: ADMIN.id, role: "admin", status: "approved" };

function setup(users: User[]) {
  const repository = new FakeUserRepository([ADMIN, ...users]);

  return { repository, useCase: new SetInstructorFlag(repository) };
}

describe("SetInstructorFlag", () => {
  it("switches the flag on and off for another admin", async () => {
    const bia = buildUser("admin", "approved", "Bia Souza");
    const { repository, useCase } = setup([bia]);

    await expect(
      useCase.execute({ actor: ACTOR, userId: bia.id, isInstructor: true }),
    ).resolves.toEqual({ id: bia.id, isInstructor: true });
    expect((await repository.findById(bia.id))?.isInstructor).toBe(true);

    await expect(
      useCase.execute({ actor: ACTOR, userId: bia.id, isInstructor: false }),
    ).resolves.toEqual({ id: bia.id, isInstructor: false });
    expect((await repository.findById(bia.id))?.isInstructor).toBe(false);
  });

  it("lets an admin switch their own flag", async () => {
    const { repository, useCase } = setup([]);

    await expect(
      useCase.execute({ actor: ACTOR, userId: ADMIN.id, isInstructor: true }),
    ).resolves.toEqual({ id: ADMIN.id, isInstructor: true });
    expect((await repository.findById(ADMIN.id))?.isInstructor).toBe(true);
  });

  it("answers 200 and changes nothing else when sending the stored value", async () => {
    const bia = buildUser("admin", "approved", "Bia Souza", true);
    const { repository, useCase } = setup([bia]);

    await expect(
      useCase.execute({ actor: ACTOR, userId: bia.id, isInstructor: true }),
    ).resolves.toEqual({ id: bia.id, isInstructor: true });
    expect((await repository.findById(bia.id))?.role).toBe("admin");
    expect((await repository.findById(bia.id))?.status).toBe("approved");
  });

  describe("refuses", () => {
    it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "a caller whose status is %s",
      async (status) => {
        const bia = buildUser("admin", "approved", "Bia Souza");
        const { useCase } = setup([bia]);

        await expect(
          useCase.execute({ actor: { ...ACTOR, status }, userId: bia.id, isInstructor: true }),
        ).rejects.toMatchObject({ constructor: ForbiddenError, message: "user.status.notApproved" });
      },
    );

    it.each<UserRole>(["instructor", "student"])("a %s caller", async (role) => {
      const bia = buildUser("admin", "approved", "Bia Souza");
      const { useCase } = setup([bia]);

      await expect(
        useCase.execute({ actor: { ...ACTOR, role }, userId: bia.id, isInstructor: true }),
      ).rejects.toMatchObject({ constructor: ForbiddenError, message: "user.role.notAdmin" });
    });

    it.each<[string, unknown]>([
      ["a missing flag", undefined],
      ["a string", "true"],
      ["a number", 1],
      ["null", null],
    ])("%s, before looking for the person", async (_label, isInstructor) => {
      const { useCase } = setup([]);

      const error = await useCase
        .execute({ actor: ACTOR, userId: "not-a-uuid", isInstructor })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ValidationException);
      expect(error).toMatchObject({
        errors: [expect.objectContaining({ message: "people.isInstructor.invalid" })],
      });
    });

    it("a malformed or unknown id", async () => {
      const { useCase } = setup([]);

      await expect(
        useCase.execute({ actor: ACTOR, userId: "nope", isInstructor: true }),
      ).rejects.toMatchObject({ constructor: NotFoundError, message: "user.notFound" });
      await expect(
        useCase.execute({
          actor: ACTOR,
          userId: "5f1d5a0e-7d0b-4f0a-9b5e-1f5c1d0e7a11",
          isInstructor: true,
        }),
      ).rejects.toMatchObject({ constructor: NotFoundError, message: "user.notFound" });
    });

    it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "a target whose status is %s",
      async (status) => {
        const bia = buildUser("admin", status, "Bia Souza");
        const { repository, useCase } = setup([bia]);

        await expect(
          useCase.execute({ actor: ACTOR, userId: bia.id, isInstructor: true }),
        ).rejects.toMatchObject({ constructor: ConflictError, message: "user.status.notApproved" });
        expect((await repository.findById(bia.id))?.isInstructor).toBe(false);
      },
    );

    it.each<UserRole>(["instructor", "student"])("a target who is a %s", async (role) => {
      const ana = buildUser(role);
      const { repository, useCase } = setup([ana]);

      await expect(
        useCase.execute({ actor: ACTOR, userId: ana.id, isInstructor: true }),
      ).rejects.toMatchObject({ constructor: ConflictError, message: "people.isInstructor.notAdmin" });
      expect((await repository.findById(ana.id))?.isInstructor).toBe(false);
    });

    it("a target whose role changed between the read and the write", async () => {
      const bia = buildUser("admin", "approved", "Bia Souza");
      const { repository, useCase } = setup([bia]);
      const find = repository.findById.bind(repository);
      repository.findById = async (id) => {
        const found = await find(id);
        await repository.update(bia.clone({ role: "instructor" }));
        return found;
      };

      await expect(
        useCase.execute({ actor: ACTOR, userId: bia.id, isInstructor: true }),
      ).rejects.toMatchObject({ constructor: ConflictError, message: "user.role.changeNotAllowed" });
      expect((await repository.users.find((item) => item.id === bia.id))?.isInstructor).toBe(false);
    });
  });
});
