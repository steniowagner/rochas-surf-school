import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  ChangeRole,
  RegistrationActor,
  User,
  UserRole,
  UserStatus,
} from "../../../src";
import {
  FakeRoleChangeNotifier,
  FakeSeatReleaser,
  FakeTeachingReleaser,
  FakeUserRepository,
} from "../../mock";

const buildUser = (role: UserRole, status: UserStatus = "approved", name = "Ana Souza") =>
  new User({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    whatsappVisible: false,
    role,
    status,
  });

const ADMIN = buildUser("admin", "approved", "Rita Admin");
const ACTOR: RegistrationActor = { id: ADMIN.id, role: "admin", status: "approved" };

function setup(users: User[]) {
  const repository = new FakeUserRepository([ADMIN, ...users]);
  const seatReleaser = new FakeSeatReleaser();
  const teachingReleaser = new FakeTeachingReleaser();
  const notifier = new FakeRoleChangeNotifier();
  const useCase = new ChangeRole(repository, seatReleaser, teachingReleaser, notifier);

  return { repository, seatReleaser, teachingReleaser, notifier, useCase };
}

describe("ChangeRole", () => {
  it("promotes a student to instructor after releasing their seats, and tells them", async () => {
    const ana = buildUser("student");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);
    seatReleaser.count = 2;
    let roleWhenReleased: UserRole | undefined;
    const release = seatReleaser.releaseSeats.bind(seatReleaser);
    seatReleaser.releaseSeats = async (userId) => {
      roleWhenReleased = (await repository.findById(userId))?.role;
      return release(userId);
    };

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "instructor" })).resolves.toEqual({
      id: ana.id,
      role: "instructor",
    });

    expect(seatReleaser.released).toEqual([ana.id]);
    expect(roleWhenReleased).toBe("student");
    expect(teachingReleaser.released).toEqual([]);
    expect((await repository.findById(ana.id))?.role).toBe("instructor");
    expect(notifier.events).toEqual([
      { userId: ana.id, role: "instructor", seatsReleased: true, classesReleased: false },
    ]);
  });

  it("promotes a student with nothing to release the same way", async () => {
    const ana = buildUser("student");
    const { repository, seatReleaser, notifier, useCase } = setup([ana]);

    await useCase.execute({ actor: ACTOR, userId: ana.id, role: "instructor" });

    expect(seatReleaser.released).toEqual([ana.id]);
    expect((await repository.findById(ana.id))?.role).toBe("instructor");
    expect(notifier.events).toEqual([
      { userId: ana.id, role: "instructor", seatsReleased: false, classesReleased: false },
    ]);
  });

  it("promotes a student to admin after releasing their seats", async () => {
    const ana = buildUser("student");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);
    seatReleaser.count = 1;

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "admin" })).resolves.toEqual({
      id: ana.id,
      role: "admin",
    });

    expect(seatReleaser.released).toEqual([ana.id]);
    expect(teachingReleaser.released).toEqual([]);
    expect((await repository.findById(ana.id))?.role).toBe("admin");
    expect(notifier.events).toEqual([
      { userId: ana.id, role: "admin", seatsReleased: true, classesReleased: false },
    ]);
  });

  it("promotes an instructor to admin without releasing anything", async () => {
    const ana = buildUser("instructor");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "admin" })).resolves.toEqual({
      id: ana.id,
      role: "admin",
    });

    expect(seatReleaser.released).toEqual([]);
    expect(teachingReleaser.released).toEqual([]);
    expect((await repository.findById(ana.id))?.role).toBe("admin");
    expect(notifier.events).toEqual([
      { userId: ana.id, role: "admin", seatsReleased: false, classesReleased: false },
    ]);
  });

  it("demotes an instructor to student after releasing their upcoming classes, with the actor", async () => {
    const ana = buildUser("instructor");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);
    teachingReleaser.count = 3;
    let roleWhenReleased: UserRole | undefined;
    const release = teachingReleaser.releaseUpcomingClasses.bind(teachingReleaser);
    teachingReleaser.releaseUpcomingClasses = async (userId, actorId) => {
      roleWhenReleased = (await repository.findById(userId))?.role;
      return release(userId, actorId);
    };

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "student" })).resolves.toEqual({
      id: ana.id,
      role: "student",
    });

    expect(teachingReleaser.released).toEqual([ana.id]);
    expect(teachingReleaser.actors).toEqual([ADMIN.id]);
    expect(roleWhenReleased).toBe("instructor");
    expect(seatReleaser.released).toEqual([]);
    expect((await repository.findById(ana.id))?.role).toBe("student");
    expect(notifier.events).toEqual([
      { userId: ana.id, role: "student", seatsReleased: false, classesReleased: true },
    ]);
  });

  it("demotes an instructor without upcoming classes, telling them nothing was released", async () => {
    const ana = buildUser("instructor");
    const { notifier, useCase } = setup([ana]);

    await useCase.execute({ actor: ACTOR, userId: ana.id, role: "student" });

    expect(notifier.events).toEqual([
      { userId: ana.id, role: "student", seatsReleased: false, classesReleased: false },
    ]);
  });

  it("makes another admin an instructor without releasing their classes", async () => {
    const bia = buildUser("admin", "approved", "Bia Souza");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([bia]);

    await expect(useCase.execute({ actor: ACTOR, userId: bia.id, role: "instructor" })).resolves.toEqual({
      id: bia.id,
      role: "instructor",
    });

    expect(seatReleaser.released).toEqual([]);
    expect(teachingReleaser.released).toEqual([]);
    expect((await repository.findById(bia.id))?.role).toBe("instructor");
    expect(notifier.events).toEqual([
      { userId: bia.id, role: "instructor", seatsReleased: false, classesReleased: false },
    ]);
  });

  it("keeps the change when the notification fails", async () => {
    const ana = buildUser("student");
    const { repository, notifier, useCase } = setup([ana]);
    notifier.failWith = new Error("push down");

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "instructor" })).resolves.toEqual({
      id: ana.id,
      role: "instructor",
    });
    expect((await repository.findById(ana.id))?.role).toBe("instructor");
  });

  it("fails the whole call, writing nothing, when a release fails", async () => {
    const ana = buildUser("student");
    const bob = buildUser("instructor", "approved", "Bob Lima");
    const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana, bob]);
    seatReleaser.failWith = new Error("db down");
    teachingReleaser.failWith = new Error("db down");

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "admin" })).rejects.toThrow("db down");
    await expect(useCase.execute({ actor: ACTOR, userId: bob.id, role: "student" })).rejects.toThrow("db down");

    expect((await repository.findById(ana.id))?.role).toBe("student");
    expect((await repository.findById(bob.id))?.role).toBe("instructor");
    expect(notifier.events).toEqual([]);
  });

  describe("refuses", () => {
    async function expectRefused(
      run: () => Promise<unknown>,
      kind: new (...args: never[]) => Error,
      message: string,
      context: ReturnType<typeof setup>,
      target: User,
    ) {
      const error = await run().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(kind);
      expect(error).toMatchObject(
        kind === ValidationException ? { errors: [expect.objectContaining({ message })] } : { message },
      );
      expect(await context.repository.findById(target.id)).toBe(target);
      expect(context.seatReleaser.released).toEqual([]);
      expect(context.teachingReleaser.released).toEqual([]);
      expect(context.notifier.events).toEqual([]);
    }

    it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "refuses a caller whose status is %s",
      async (status) => {
        const ana = buildUser("student");
        const context = setup([ana]);

        await expectRefused(
          () => context.useCase.execute({ actor: { ...ACTOR, status }, userId: ana.id, role: "instructor" }),
          ForbiddenError,
          "user.status.notApproved",
          context,
          ana,
        );
      },
    );

    it.each<UserRole>(["student", "instructor"])("refuses an approved %s caller, before the role", async (role) => {
      const ana = buildUser("student");
      const context = setup([ana]);

      await expectRefused(
        () => context.useCase.execute({ actor: { ...ACTOR, role }, userId: ana.id, role: "boss" }),
        ForbiddenError,
        "user.role.notAdmin",
        context,
        ana,
      );
    });

    it.each([undefined, null, 1, "", "boss", "Admin"])("refuses the role %p, before the target", async (role) => {
      const ana = buildUser("student");
      const context = setup([ana]);

      await expectRefused(
        () => context.useCase.execute({ actor: ACTOR, userId: "unknown", role }),
        ValidationException,
        "people.role.invalid",
        context,
        ana,
      );
    });

    it.each(["unknown", "7d1e2f3a-4b5c-4d6e-8f7a-9b0c1d2e3f4a"])("refuses an unknown person (%s)", async (userId) => {
      const ana = buildUser("student");
      const context = setup([ana]);
      const findById = jest.spyOn(context.repository, "findById");

      await expectRefused(
        () => context.useCase.execute({ actor: ACTOR, userId, role: "instructor" }),
        NotFoundError,
        "user.notFound",
        context,
        ana,
      );
      expect(findById).toHaveBeenCalledTimes(userId === "unknown" ? 1 : 2);
    });

    it("refuses a change of one's own role, before the pair", async () => {
      const context = setup([]);

      await expectRefused(
        () => context.useCase.execute({ actor: ACTOR, userId: ADMIN.id, role: "admin" }),
        ForbiddenError,
        "user.role.self",
        context,
        ADMIN,
      );
    });

    it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "refuses a target whose status is %s, before the pair",
      async (status) => {
        const ana = buildUser("student", status);
        const context = setup([ana]);

        await expectRefused(
          () => context.useCase.execute({ actor: ACTOR, userId: ana.id, role: "student" }),
          ConflictError,
          "user.status.notApproved",
          context,
          ana,
        );
      },
    );

    it.each<[UserRole, UserRole]>([
      ["admin", "student"],
      ["admin", "admin"],
      ["instructor", "instructor"],
      ["student", "student"],
    ])("refuses %s → %s", async (from, to) => {
      const bia = buildUser(from, "approved", "Bia Souza");
      const context = setup([bia]);

      await expectRefused(
        () => context.useCase.execute({ actor: ACTOR, userId: bia.id, role: to }),
        ConflictError,
        "user.role.changeNotAllowed",
        context,
        bia,
      );
    });

    it("refuses a change made meanwhile, after the release, without telling anyone", async () => {
      const ana = buildUser("student");
      const { repository, seatReleaser, notifier, useCase } = setup([ana]);
      seatReleaser.releaseSeats = async (userId) => {
        await repository.update(ana.clone({ role: "admin" }));
        seatReleaser.released.push(userId);
        return 0;
      };

      await expect(useCase.execute({ actor: ACTOR, userId: ana.id, role: "instructor" })).rejects.toMatchObject({
        constructor: ConflictError,
        message: "user.role.changeNotAllowed",
      });
      expect((await repository.findById(ana.id))?.role).toBe("admin");
      expect(notifier.events).toEqual([]);
    });

    it("refuses to take away the last approved admin, without telling anyone", async () => {
      const bia = buildUser("admin", "approved", "Bia Souza");
      const { repository, notifier, useCase } = setup([bia]);
      // The actor stopped being an approved admin meanwhile (the other admin demoted them first).
      await repository.update(ADMIN.clone({ role: "instructor" }));

      await expect(useCase.execute({ actor: ACTOR, userId: bia.id, role: "instructor" })).rejects.toMatchObject({
        constructor: ConflictError,
        message: "user.role.lastAdmin",
      });
      expect((await repository.findById(bia.id))?.role).toBe("admin");
      expect(notifier.events).toEqual([]);
    });
  });
});
