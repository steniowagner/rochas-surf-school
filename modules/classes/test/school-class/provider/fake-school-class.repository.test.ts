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
});
