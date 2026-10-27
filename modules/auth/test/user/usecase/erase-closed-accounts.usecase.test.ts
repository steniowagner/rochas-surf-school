import { EraseClosedAccounts, User, UserState, UserStatus } from "../../../src";
import { FakeClockProvider, FakePersonNotificationEraser, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-11-12T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function buildUser(status: UserStatus, extra: Partial<UserState> = {}): User {
  return new User({
    name: "Bruno Lima",
    email: "bruno@example.com",
    whatsappVisible: false,
    role: "student",
    status,
    ...extra,
  });
}

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

function deletedAgo(ms: number, extra: Partial<UserState> = {}): User {
  return buildUser("deleted", { deletedAt: ago(ms), ...extra });
}

function removedAgo(ms: number): User {
  return buildUser("removed", { removedAt: ago(ms) });
}

function setup(users: User[]) {
  const repository = new FakeUserRepository(users);
  const eraser = new FakePersonNotificationEraser();
  const useCase = new EraseClosedAccounts(repository, eraser, new FakeClockProvider(NOW));

  return { repository, eraser, useCase };
}

describe("EraseClosedAccounts", () => {
  it("erases an account deleted exactly 30 days ago and the notifications about it", async () => {
    const due = deletedAgo(30 * DAY);
    const { repository, eraser, useCase } = setup([due]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 1 });

    expect(repository.erasedIds).toEqual([due.id]);
    expect(repository.users).toEqual([]);
    expect(eraser.erased).toEqual([[due.id]]);
  });

  it("erases an account removed 30 days and 1 minute ago", async () => {
    const due = removedAgo(30 * DAY + MINUTE);
    const { repository, eraser, useCase } = setup([due]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 1 });

    expect(repository.erasedIds).toEqual([due.id]);
    expect(eraser.erased).toEqual([[due.id]]);
  });

  it("erases a due deleted account with a pending reactivation request", async () => {
    const due = deletedAgo(31 * DAY, {
      reactivationStatus: "requested",
      reactivationRequestedAt: ago(DAY),
    });
    const { repository, useCase } = setup([due]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 1 });

    expect(repository.erasedIds).toEqual([due.id]);
  });

  it("erases every due account in one call and answers the count", async () => {
    const deleted = deletedAgo(40 * DAY);
    const removed = removedAgo(31 * DAY);
    const recent = deletedAgo(DAY);
    const { repository, eraser, useCase } = setup([deleted, recent, removed]);

    await expect(useCase.execute()).resolves.toEqual({ erased: 2 });

    expect(eraser.erased).toEqual([[deleted.id, removed.id]]);
    expect(repository.erasedIds).toEqual([deleted.id, removed.id]);
    expect(repository.users).toEqual([recent]);
  });

  it("keeps accounts deleted or removed less than 30 days ago", async () => {
    const recent = [deletedAgo(30 * DAY - MINUTE), removedAgo(29 * DAY)];
    const { repository, eraser, useCase } = setup(recent);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual(recent);
    expect(eraser.erased).toEqual([]);
  });

  it("keeps a deleted or removed account without its date", async () => {
    const undated = [buildUser("deleted"), buildUser("removed")];
    const { repository, useCase } = setup(undated);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual(undated);
  });

  it("keeps every other status whatever its dates", async () => {
    const old = ago(90 * DAY);
    const others = (["pending", "approved", "denied"] as UserStatus[]).map((status) =>
      buildUser(status, { deletedAt: old, removedAt: old, deniedAt: old }),
    );
    const { repository, useCase } = setup(others);

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(repository.users).toEqual(others);
  });

  it("erases nothing and doesn't call the eraser when nothing is due", async () => {
    const { repository, eraser, useCase } = setup([]);
    const spy = jest.spyOn(repository, "eraseClosed");

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(eraser.erased).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("erases nothing again on a second run", async () => {
    const { eraser, useCase } = setup([deletedAgo(31 * DAY)]);
    await useCase.execute();

    await expect(useCase.execute()).resolves.toEqual({ erased: 0 });

    expect(eraser.erased).toHaveLength(1);
  });

  it("passes the cutoff of 30 × 24 hours before now to the write", async () => {
    const due = deletedAgo(31 * DAY);
    const { repository, useCase } = setup([due]);
    const spy = jest.spyOn(repository, "eraseClosed");

    await useCase.execute();

    expect(spy).toHaveBeenCalledWith([due.id], ago(30 * DAY));
  });

  it("propagates an eraser failure and erases no account, so the next run retries", async () => {
    const due = deletedAgo(31 * DAY);
    const { repository, eraser, useCase } = setup([due]);
    eraser.failWith = new Error("db down");

    await expect(useCase.execute()).rejects.toThrow("db down");

    expect(repository.users).toEqual([due]);
    expect(repository.erasedIds).toEqual([]);

    eraser.failWith = null;
    await expect(useCase.execute()).resolves.toEqual({ erased: 1 });
  });
});
