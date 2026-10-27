import { ConflictError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { RegistrationActor, RemoveUser, User, UserRole, UserStatus } from "../../../src";
import {
  FakeAccountRemovalNotifier,
  FakeClockProvider,
  FakeSeatReleaser,
  FakeTeachingReleaser,
  FakeUserRepository,
} from "../../mock";

const NOW = new Date("2026-10-07T12:00:00.000Z");

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
const UNKNOWN_ID = "6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10";

function setup(users: User[]) {
  const repository = new FakeUserRepository([ADMIN, ...users]);
  const clock = new FakeClockProvider(NOW);
  const seatReleaser = new FakeSeatReleaser();
  const teachingReleaser = new FakeTeachingReleaser();
  const notifier = new FakeAccountRemovalNotifier();
  const useCase = new RemoveUser(repository, clock, seatReleaser, teachingReleaser, notifier);

  return { repository, seatReleaser, teachingReleaser, notifier, useCase };
}

describe("RemoveUser", () => {
  it.each(["student", "instructor", "admin"] as const)(
    "removes an approved %s after releasing their seats and classes, and tells them",
    async (role) => {
      const ana = buildUser(role);
      const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);
      seatReleaser.count = 2;
      teachingReleaser.count = 1;

      await expect(useCase.execute({ actor: ACTOR, userId: ana.id })).resolves.toEqual({
        id: ana.id,
        status: "removed",
      });

      expect(seatReleaser.released).toEqual([ana.id]);
      expect(teachingReleaser.released).toEqual([ana.id]);
      expect(teachingReleaser.actors).toEqual([ADMIN.id]);
      const stored = await repository.findById(ana.id);
      expect(stored?.status).toBe("removed");
      expect(stored?.removedAt).toEqual(NOW);
      expect(stored?.role).toBe(role);
      expect(notifier.removed).toEqual([ana.id]);
      expect(notifier.restored).toEqual([]);
    },
  );

  it("keeps an approved admin when removing another admin", async () => {
    const other = buildUser("admin", "approved", "Bia Admin");
    const { repository, useCase } = setup([other]);

    await useCase.execute({ actor: ACTOR, userId: other.id });

    expect(await repository.countApprovedAdmins()).toBe(1);
  });

  it("answers the same when the notifier fails", async () => {
    const ana = buildUser("student");
    const { notifier, useCase } = setup([ana]);
    notifier.failWith = new Error("push down");

    await expect(useCase.execute({ actor: ACTOR, userId: ana.id })).resolves.toEqual({
      id: ana.id,
      status: "removed",
    });
  });

  describe("refuses", () => {
    it("a caller that isn't approved, before anything else", async () => {
      const ana = buildUser("student");
      const { useCase } = setup([ana]);

      await expect(
        useCase.execute({ actor: { ...ACTOR, status: "deleted" }, userId: ana.id }),
      ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    });

    it("an approved non-admin", async () => {
      const ana = buildUser("student");
      const { useCase } = setup([ana]);

      await expect(
        useCase.execute({ actor: { ...ACTOR, role: "instructor" }, userId: ana.id }),
      ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    });

    it.each(["not-a-uuid", UNKNOWN_ID])("the id %s, which names no one", async (userId) => {
      const { seatReleaser, useCase } = setup([]);

      await expect(useCase.execute({ actor: ACTOR, userId })).rejects.toThrow(
        new NotFoundError("user.notFound"),
      );
      expect(seatReleaser.released).toEqual([]);
    });

    it("the caller's own account", async () => {
      const { repository, seatReleaser, notifier, useCase } = setup([]);

      await expect(useCase.execute({ actor: ACTOR, userId: ADMIN.id })).rejects.toThrow(
        new ForbiddenError("user.remove.self"),
      );
      expect(seatReleaser.released).toEqual([]);
      expect((await repository.findById(ADMIN.id))?.status).toBe("approved");
      expect(notifier.removed).toEqual([]);
    });

    it.each(["pending", "denied", "deleted", "removed"] as const)(
      "a %s account, releasing nothing",
      async (status) => {
        const ana = buildUser("student", status);
        const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);

        await expect(useCase.execute({ actor: ACTOR, userId: ana.id })).rejects.toThrow(
          new ConflictError("user.status.notApproved"),
        );

        expect(seatReleaser.released).toEqual([]);
        expect(teachingReleaser.released).toEqual([]);
        expect((await repository.findById(ana.id))?.status).toBe(status);
        expect(notifier.removed).toEqual([]);
      },
    );

    it("an account that changed between the read and the write", async () => {
      const ana = buildUser("student");
      const { repository, seatReleaser, notifier, useCase } = setup([ana]);
      const release = seatReleaser.releaseSeats.bind(seatReleaser);
      seatReleaser.releaseSeats = async (userId) => {
        const index = repository.users.findIndex((item) => item.id === userId);
        repository.users[index] = repository.users[index].clone({ role: "instructor" });
        return release(userId);
      };

      await expect(useCase.execute({ actor: ACTOR, userId: ana.id })).rejects.toThrow(
        new ConflictError("user.status.notApproved"),
      );
      expect((await repository.findById(ana.id))?.status).toBe("approved");
      expect(notifier.removed).toEqual([]);
    });

    it("the removal of the last approved admin", async () => {
      const other = buildUser("admin", "approved", "Bia Admin");
      const { repository, notifier, useCase } = setup([other]);
      jest.spyOn(repository, "updateKeepingAnAdmin").mockResolvedValue("lastAdmin");

      await expect(useCase.execute({ actor: ACTOR, userId: other.id })).rejects.toThrow(
        new ConflictError("user.role.lastAdmin"),
      );
      expect(notifier.removed).toEqual([]);
    });

    it.each(["seats", "classes"] as const)("when releasing the %s fails, writing nothing", async (which) => {
      const ana = buildUser("instructor");
      const { repository, seatReleaser, teachingReleaser, notifier, useCase } = setup([ana]);
      (which === "seats" ? seatReleaser : teachingReleaser).failWith = new Error("db down");

      await expect(useCase.execute({ actor: ACTOR, userId: ana.id })).rejects.toThrow("db down");
      expect((await repository.findById(ana.id))?.status).toBe("approved");
      expect(notifier.removed).toEqual([]);
    });
  });
});
