import { EraseDeniedRegistrations, User, UserState, UserStatus } from "../../../src";
import {
  FakeClockProvider,
  FakeRegistrationNotificationEraser,
  FakeUserRepository,
} from "../../mock";

const NOW = new Date("2026-11-12T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function buildUser(status: UserStatus, deniedAt?: Date, extra: Partial<UserState> = {}): User {
  return new User({
    name: "Bruno Lima",
    email: "bruno@example.com",
    whatsappVisible: false,
    role: "student",
    status,
    deniedAt,
    ...extra,
  });
}

function deniedAgo(ms: number): User {
  return buildUser("denied", new Date(NOW.getTime() - ms));
}

function setup(users: User[]) {
  const repository = new FakeUserRepository(users);
  const eraser = new FakeRegistrationNotificationEraser();
  const useCase = new EraseDeniedRegistrations(repository, eraser, new FakeClockProvider(NOW));

  return { repository, eraser, useCase };
}

describe("EraseDeniedRegistrations", () => {
  it("erases an account denied exactly 30 days ago and its notifications", async () => {
    const due = deniedAgo(30 * DAY);
    const { repository, eraser, useCase } = setup([due]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 1 });

    expect(repository.users).toEqual([]);
    expect(eraser.erased).toEqual([[due.id]]);
  });

  it("keeps an account denied 30 days minus one minute ago", async () => {
    const recent = deniedAgo(30 * DAY - MINUTE);
    const { repository, useCase } = setup([recent]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual([recent]);
  });

  it("keeps a denied account without deniedAt", async () => {
    const undated = buildUser("denied");
    const { repository, useCase } = setup([undated]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual([undated]);
  });

  it("keeps every other status whatever its dates", async () => {
    const old = new Date(NOW.getTime() - 90 * DAY);
    const others = (["pending", "approved", "deleted", "removed"] as UserStatus[]).map((status) =>
      buildUser(status, old, { removedAt: old }),
    );
    const { repository, useCase } = setup(others);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual(others);
  });

  it("erases nothing and doesn't call the eraser when nothing is due", async () => {
    const { eraser, useCase } = setup([]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(eraser.erased).toEqual([]);
  });

  it("erases nothing again on a second run", async () => {
    const { eraser, useCase } = setup([deniedAgo(31 * DAY)]);
    await useCase.execute();

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(eraser.erased).toHaveLength(1);
  });

  it("propagates an eraser failure and deletes no user", async () => {
    const due = deniedAgo(31 * DAY);
    const { repository, eraser, useCase } = setup([due]);
    eraser.failWith = new Error("db down");

    await expect(useCase.execute()).rejects.toThrow("db down");

    expect(repository.users).toEqual([due]);
  });
});
