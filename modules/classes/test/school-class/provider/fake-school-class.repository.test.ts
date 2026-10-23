import { buildClass, FakeSchoolClassRepository, INSTRUCTOR_ID } from "../../mock";

describe("FakeSchoolClassRepository", () => {
  it("stores classes and finds those starting in [from, to)", async () => {
    const early = buildClass({
      startsAt: new Date("2026-10-12T11:00:00.000Z"),
      endsAt: new Date("2026-10-12T12:00:00.000Z"),
    });
    const inside = buildClass();
    const repository = new FakeSchoolClassRepository();

    await repository.createMany([early, inside]);

    expect(repository.all).toHaveLength(2);
    expect(
      await repository.findStartingBetween(
        new Date("2026-10-15T11:00:00.000Z"),
        new Date("2026-10-15T11:00:00.001Z"),
      ),
    ).toEqual([inside]);
    expect(
      await repository.findStartingBetween(
        new Date("2026-10-15T00:00:00.000Z"),
        new Date("2026-10-15T11:00:00.000Z"),
      ),
    ).toEqual([]);
  });

  it("fails once when asked to and then stores nothing of that call", async () => {
    const repository = new FakeSchoolClassRepository();
    repository.failNextCreate = true;

    await expect(repository.createMany([buildClass()])).rejects.toThrow("createMany failed");
    expect(repository.all).toHaveLength(0);

    await repository.createMany([buildClass()]);
    expect(repository.all).toHaveLength(1);
  });

  it("finds a class by id, or null", async () => {
    const stored = buildClass();
    const repository = new FakeSchoolClassRepository([stored]);

    expect(await repository.findById(stored.id)).toBe(stored);
    expect(await repository.findById("11111111-1111-4111-8111-111111111111")).toBeNull();
  });

  it("replaces the stored class on update and records the call", async () => {
    const stored = buildClass();
    const other = buildClass();
    const repository = new FakeSchoolClassRepository([stored, other]);
    const edited = stored.clone({ capacity: 5 });

    expect(await repository.update(edited, {})).toBe(true);

    expect(repository.updateCalls).toEqual([edited]);
    expect((await repository.findById(stored.id))?.capacity).toBe(5);
    expect(await repository.findById(other.id)).toBe(other);
  });

  it("clears the deadline in the same write and bumps its revision", async () => {
    const stored = buildClass({
      cancellationDeadline: new Date("2026-10-14T10:00:00.000Z"),
      deadlineRevision: 1,
      deadlineAttempts: 2,
      deadlineNextAttemptAt: new Date("2026-10-14T09:00:00.000Z"),
    });
    const repository = new FakeSchoolClassRepository([stored]);

    expect(await repository.update(stored.clone({ capacity: 5 }), { clearDeadline: true })).toBe(true);

    const saved = (await repository.findById(stored.id))!;
    expect(saved.capacity).toBe(5);
    expect(saved.cancellationDeadline).toBeNull();
    expect(saved.deadlineAttempts).toBe(0);
    expect(saved.deadlineNextAttemptAt).toBeNull();
    expect(saved.deadlineRevision).toBe(2);
    expect(repository.clearDeadlineCalls).toEqual([true]);
  });

  it("keeps the deadline when not told to clear it", async () => {
    const deadline = new Date("2026-10-14T10:00:00.000Z");
    const stored = buildClass({ cancellationDeadline: deadline });
    const repository = new FakeSchoolClassRepository([stored]);

    await repository.update(stored.clone({ capacity: 5 }), {});

    expect((await repository.findById(stored.id))!.cancellationDeadline).toEqual(deadline);
  });

  it("clears the reminder mark in the same write when told to", async () => {
    const stored = buildClass({ reminderSentAt: new Date("2026-10-15T10:30:00.000Z") });
    const repository = new FakeSchoolClassRepository([stored]);

    expect(await repository.update(stored.clone({ capacity: 5 }), { clearReminder: true })).toBe(true);

    const saved = (await repository.findById(stored.id))!;
    expect(saved.capacity).toBe(5);
    expect(saved.reminderSentAt).toBeNull();
    expect(repository.clearReminderCalls).toEqual([true]);
    expect(repository.clearDeadlineCalls).toEqual([false]);
  });

  it("never writes the reminder mark from the edited class", async () => {
    const remindedAt = new Date("2026-10-15T10:30:00.000Z");
    const stored = buildClass({ reminderSentAt: remindedAt });
    const repository = new FakeSchoolClassRepository([stored]);

    await repository.update(stored.clone({ capacity: 5, reminderSentAt: null }), {});
    expect((await repository.findById(stored.id))!.reminderSentAt).toEqual(remindedAt);

    const unmarked = buildClass();
    const other = new FakeSchoolClassRepository([unmarked]);
    await other.update(unmarked.clone({ reminderSentAt: remindedAt }), {});
    expect((await other.findById(unmarked.id))!.reminderSentAt).toBeNull();
    expect(other.clearReminderCalls).toEqual([false]);
  });

  it("refuses to update a cancelled class and a missing one", async () => {
    const stored = buildClass({ cancelledAt: new Date("2026-10-14T10:00:00.000Z") });
    const repository = new FakeSchoolClassRepository([stored]);

    expect(await repository.update(stored.clone({ capacity: 5 }), {})).toBe(false);
    expect((await repository.findById(stored.id))?.capacity).toBe(8);
    expect(await repository.update(buildClass(), {})).toBe(false);
  });

  it("cancels a class once, keeping the first cancellation", async () => {
    const stored = buildClass();
    const other = buildClass();
    const repository = new FakeSchoolClassRepository([stored, other]);
    const at = new Date("2026-10-14T13:00:00.000Z");

    expect(await repository.cancel(stored.id, at, "Mar grande")).toBe(true);
    expect(await repository.cancel(stored.id, new Date("2026-10-14T14:00:00.000Z"), null)).toBe(false);

    const cancelled = (await repository.findById(stored.id))!;
    expect(cancelled.cancelledAt).toEqual(at);
    expect(cancelled.cancellationMessage).toBe("Mar grande");
    expect((await repository.findById(other.id))?.cancelledAt).toBeNull();
    expect(repository.cancelCalls).toHaveLength(2);
  });

  it("answers false when cancelling a class that does not exist", async () => {
    expect(
      await new FakeSchoolClassRepository().cancel("11111111-1111-4111-8111-111111111111", new Date(), null),
    ).toBe(false);
  });

  it("deletes a class that is neither cancelled nor started, and only that one", async () => {
    const stored = buildClass();
    const other = buildClass();
    const repository = new FakeSchoolClassRepository([stored, other]);
    const now = new Date("2026-10-14T13:00:00.000Z");

    expect(await repository.delete(stored.id, now)).toBe(true);
    expect(await repository.delete(stored.id, now)).toBe(false);
    expect(await repository.findById(stored.id)).toBeNull();
    expect(await repository.findById(other.id)).toBe(other);
    expect(repository.deleteCalls).toHaveLength(2);
  });

  it("refuses to delete a started class, one starting exactly now and a cancelled one", async () => {
    const stored = buildClass();
    const cancelled = buildClass({ cancelledAt: new Date("2026-10-14T10:00:00.000Z") });
    const repository = new FakeSchoolClassRepository([stored, cancelled]);

    expect(await repository.delete(stored.id, stored.startsAt)).toBe(false);
    expect(await repository.delete(stored.id, new Date("2026-10-15T11:30:00.000Z"))).toBe(false);
    expect(await repository.delete(cancelled.id, new Date("2026-10-14T13:00:00.000Z"))).toBe(false);
    expect(repository.all).toHaveLength(2);
  });

  it("finds the upcoming, not cancelled classes a person teaches, by start then id", async () => {
    const now = new Date("2026-10-14T13:00:00.000Z");
    const other = "2b8d4e61-7a3c-4f95-9e02-5c1d7b3a8f40";
    const later = buildClass({
      startsAt: new Date("2026-10-16T11:00:00.000Z"),
      endsAt: new Date("2026-10-16T12:00:00.000Z"),
    });
    const sameStartA = buildClass({ id: "00000000-0000-4000-8000-00000000000a" });
    const sameStartB = buildClass({ id: "00000000-0000-4000-8000-00000000000b" });
    const startingNow = buildClass({ startsAt: now, endsAt: new Date("2026-10-14T14:00:00.000Z") });
    const cancelled = buildClass({ cancelledAt: new Date("2026-10-14T10:00:00.000Z") });
    const notTheirs = buildClass({ instructorIds: [other] });
    const repository = new FakeSchoolClassRepository([
      later,
      sameStartB,
      startingNow,
      cancelled,
      notTheirs,
      sameStartA,
    ]);

    expect(await repository.findUpcomingTaughtBy(INSTRUCTOR_ID, now)).toEqual([
      sameStartA,
      sameStartB,
      later,
    ]);
  });

  it("takes only that person off only the given classes", async () => {
    const other = "2b8d4e61-7a3c-4f95-9e02-5c1d7b3a8f40";
    const shared = buildClass({ instructorIds: [INSTRUCTOR_ID, other] });
    const alone = buildClass();
    const untouched = buildClass();
    const repository = new FakeSchoolClassRepository([shared, alone, untouched]);

    await repository.removeInstructor(INSTRUCTOR_ID, [shared.id, alone.id]);

    expect((await repository.findById(shared.id))?.instructorIds).toEqual([other]);
    expect((await repository.findById(alone.id))?.instructorIds).toEqual([]);
    expect((await repository.findById(untouched.id))?.instructorIds).toEqual([INSTRUCTOR_ID]);
    expect(repository.removeInstructorCalls).toEqual([
      { userId: INSTRUCTOR_ID, classIds: [shared.id, alone.id] },
    ]);
  });

  it("writes nothing when asked to remove from no class", async () => {
    const repository = new FakeSchoolClassRepository([buildClass()]);

    await repository.removeInstructor(INSTRUCTOR_ID, []);

    expect(repository.removeInstructorCalls).toEqual([]);
    expect(repository.all[0].instructorIds).toEqual([INSTRUCTOR_ID]);
  });
});
