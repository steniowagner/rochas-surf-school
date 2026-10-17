import { buildClass, FakeSchoolClassRepository } from "../../mock";

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

    expect(await repository.update(edited)).toBe(true);

    expect(repository.updateCalls).toEqual([edited]);
    expect((await repository.findById(stored.id))?.capacity).toBe(5);
    expect(await repository.findById(other.id)).toBe(other);
  });

  it("refuses to update a cancelled class and a missing one", async () => {
    const stored = buildClass({ cancelledAt: new Date("2026-10-14T10:00:00.000Z") });
    const repository = new FakeSchoolClassRepository([stored]);

    expect(await repository.update(stored.clone({ capacity: 5 }))).toBe(false);
    expect((await repository.findById(stored.id))?.capacity).toBe(8);
    expect(await repository.update(buildClass())).toBe(false);
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
});
