import { ForbiddenError, UnauthorizedError } from "@rochas-surf-school/shared";
import { DeleteAccount, User, UserRole, UserStatus } from "../../../src";
import { FakeClockProvider, FakeSeatReleaser, FakeTeachingReleaser, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-14T12:00:00.000Z");

const buildUser = (status: UserStatus = "approved", role: UserRole = "student") =>
  new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappVisible: false,
    role,
    status,
  });

function setup(users: User[] = []) {
  const repository = new FakeUserRepository(users);
  const releaser = new FakeTeachingReleaser();
  const seatReleaser = new FakeSeatReleaser();
  const useCase = new DeleteAccount(repository, new FakeClockProvider(NOW), releaser, seatReleaser);

  return { repository, releaser, seatReleaser, useCase };
}

describe("DeleteAccount", () => {
  it("closes an approved account and stamps the deletion", async () => {
    const ana = buildUser();
    const { repository, useCase } = setup([ana]);

    await useCase.execute({ userId: ana.id });

    const saved = await repository.findById(ana.id);
    expect(saved?.status).toBe("deleted");
    expect(saved?.deletedAt).toEqual(NOW);
  });

  it.each<UserRole>(["student", "instructor", "admin"])(
    "releases the upcoming classes of an approved %s before marking the account deleted",
    async (role) => {
      const ana = buildUser("approved", role);
      const { repository, releaser, useCase } = setup([ana]);
      let statusWhenReleased: string | undefined;
      releaser.releaseUpcomingClasses = async (userId) => {
        statusWhenReleased = (await repository.findById(userId))?.status;
        releaser.released.push(userId);
      };

      await useCase.execute({ userId: ana.id });

      expect(releaser.released).toEqual([ana.id]);
      expect(statusWhenReleased).toBe("approved");
      expect((await repository.findById(ana.id))?.status).toBe("deleted");
    },
  );

  it.each<UserRole>(["student", "instructor", "admin"])(
    "releases the seats of an approved %s after the classes and before marking the account deleted",
    async (role) => {
      const ana = buildUser("approved", role);
      const { repository, releaser, seatReleaser, useCase } = setup([ana]);
      const order: string[] = [];
      let statusWhenReleased: string | undefined;
      releaser.releaseUpcomingClasses = async () => {
        order.push("classes");
      };
      seatReleaser.releaseSeats = async (userId) => {
        order.push("seats");
        statusWhenReleased = (await repository.findById(userId))?.status;
        seatReleaser.released.push(userId);
      };

      await useCase.execute({ userId: ana.id });

      expect(order).toEqual(["classes", "seats"]);
      expect(seatReleaser.released).toEqual([ana.id]);
      expect(statusWhenReleased).toBe("approved");
      expect((await repository.findById(ana.id))?.status).toBe("deleted");
    },
  );

  it("propagates a failed seat release and keeps the account approved", async () => {
    const ana = buildUser();
    const { repository, seatReleaser, useCase } = setup([ana]);
    const failure = new Error("seats failed");
    seatReleaser.failWith = failure;

    await expect(useCase.execute({ userId: ana.id })).rejects.toBe(failure);

    const saved = await repository.findById(ana.id);
    expect(saved?.status).toBe("approved");
    expect(saved?.deletedAt).toBeNull();
  });

  it("does not release seats when the classes could not be released", async () => {
    const ana = buildUser("approved", "instructor");
    const { releaser, seatReleaser, useCase } = setup([ana]);
    releaser.failWith = new Error("release failed");

    await expect(useCase.execute({ userId: ana.id })).rejects.toThrow("release failed");

    expect(seatReleaser.released).toEqual([]);
  });

  it("propagates a failed release and keeps the account approved", async () => {
    const ana = buildUser("approved", "instructor");
    const { repository, releaser, useCase } = setup([ana]);
    const failure = new Error("release failed");
    releaser.failWith = failure;

    await expect(useCase.execute({ userId: ana.id })).rejects.toBe(failure);

    const saved = await repository.findById(ana.id);
    expect(saved?.status).toBe("approved");
    expect(saved?.deletedAt).toBeNull();
  });

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account before releasing anything",
    async (status) => {
      const ana = buildUser(status);
      const { repository, releaser, seatReleaser, useCase } = setup([ana]);

      const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
      expect((await repository.findById(ana.id))?.status).toBe(status);
      expect(releaser.released).toEqual([]);
      expect(seatReleaser.released).toEqual([]);
    },
  );

  it("refuses an unknown account before releasing anything", async () => {
    const { releaser, seatReleaser, useCase } = setup();

    const error = await useCase.execute({ userId: buildUser().id }).catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe("auth.token.invalid");
    expect(releaser.released).toEqual([]);
    expect(seatReleaser.released).toEqual([]);
  });
});
