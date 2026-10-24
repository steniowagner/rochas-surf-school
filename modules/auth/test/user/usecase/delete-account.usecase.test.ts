import { ConflictError, ForbiddenError, UnauthorizedError } from "@rochas-surf-school/shared";
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

// Another approved admin, so an admin closing their account isn't the only one.
const OTHER_ADMIN = new User({
  name: "Rita Admin",
  email: "rita@example.com",
  whatsappVisible: false,
  role: "admin",
  status: "approved",
});

function setup(users: User[] = [], { otherAdmin = true } = {}) {
  const repository = new FakeUserRepository(otherAdmin ? [...users, OTHER_ADMIN] : users);
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
        return 0;
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
        return 0;
      };
      seatReleaser.releaseSeats = async (userId) => {
        order.push("seats");
        statusWhenReleased = (await repository.findById(userId))?.status;
        seatReleaser.released.push(userId);
        return 0;
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

  describe("only admin", () => {
    it("refuses the only approved admin before releasing anything", async () => {
      const ana = buildUser("approved", "admin");
      const deletedAdmin = buildUser("deleted", "admin");
      const { repository, releaser, seatReleaser, useCase } = setup([ana, deletedAdmin], { otherAdmin: false });

      const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("user.role.lastAdmin");
      expect((await repository.findById(ana.id))?.status).toBe("approved");
      expect(releaser.released).toEqual([]);
      expect(seatReleaser.released).toEqual([]);
    });

    it("closes an admin's account when another approved admin remains", async () => {
      const ana = buildUser("approved", "admin");
      const { repository, releaser, useCase } = setup([ana]);

      await useCase.execute({ userId: ana.id });

      expect(releaser.released).toEqual([ana.id]);
      expect((await repository.findById(ana.id))?.status).toBe("deleted");
    });

    it.each<UserRole>(["student", "instructor"])("never refuses the account of a %s, even with no admin", async (role) => {
      const ana = buildUser("approved", role);
      const { repository, useCase } = setup([ana], { otherAdmin: false });

      await useCase.execute({ userId: ana.id });

      expect((await repository.findById(ana.id))?.status).toBe("deleted");
    });

    it("refuses when the other admin left meanwhile, after the release", async () => {
      const ana = buildUser("approved", "admin");
      const { repository, releaser, useCase } = setup([ana]);
      releaser.releaseUpcomingClasses = async (userId) => {
        // The other admin closed their account while this one was releasing.
        await repository.update(OTHER_ADMIN.clone({ status: "deleted" }));
        releaser.released.push(userId);
        return 1;
      };

      const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("user.role.lastAdmin");
      expect((await repository.findById(ana.id))?.status).toBe("approved");
    });

    it("refuses when the account changed meanwhile", async () => {
      const ana = buildUser();
      const { repository, seatReleaser, useCase } = setup([ana]);
      seatReleaser.releaseSeats = async () => {
        await repository.update(ana.clone({ status: "deleted", deletedAt: NOW }));
        return 0;
      };

      const error = await useCase.execute({ userId: ana.id }).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
    });
  });
});
