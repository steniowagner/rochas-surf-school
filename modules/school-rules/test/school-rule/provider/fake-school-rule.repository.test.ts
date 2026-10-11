import { SchoolRule } from "../../../src";
import { FakeSchoolRuleRepository } from "../../mock";

function buildRule(title: string, index: number, createdAt?: Date): SchoolRule {
  return new SchoolRule({
    title,
    description: `${title} description`,
    index,
    createdAt,
  });
}

describe("FakeSchoolRuleRepository", () => {
  it("starts at version 0 with no rules", async () => {
    const repository = new FakeSchoolRuleRepository();

    await expect(repository.getVersion()).resolves.toBe(0);
    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it("sorts by index, then by creation time", async () => {
    const early = buildRule("early", 2, new Date("2026-01-01T00:00:00Z"));
    const late = buildRule("late", 2, new Date("2026-02-01T00:00:00Z"));
    const first = buildRule("first", 1, new Date("2026-03-01T00:00:00Z"));
    const repository = new FakeSchoolRuleRepository([late, first, early]);

    const rules = await repository.findAll();

    expect(rules.map((item) => item.title)).toEqual(["first", "early", "late"]);
  });

  it("finds a rule by id, or null", async () => {
    const rule = buildRule("a", 1);
    const repository = new FakeSchoolRuleRepository([rule]);

    await expect(repository.findById(rule.id)).resolves.toBe(rule);
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("applies deletes and saves and raises the version when asked", async () => {
    const a = buildRule("a", 1);
    const b = buildRule("b", 2);
    const added = buildRule("c", 2);
    const moved = b.clone({ index: 1 });
    const repository = new FakeSchoolRuleRepository([a, b], 4);

    const version = await repository.apply({
      save: [added, moved],
      delete: [a.id],
      bumpVersion: true,
    });

    expect(version).toBe(5);
    await expect(repository.getVersion()).resolves.toBe(5);
    const rules = await repository.findAll();
    expect(rules.map((item) => [item.title, item.index])).toEqual([
      ["b", 1],
      ["c", 2],
    ]);
    expect(repository.applied).toHaveLength(1);
  });

  it("keeps the version when bumpVersion is false", async () => {
    const a = buildRule("a", 1);
    const repository = new FakeSchoolRuleRepository([a], 3);

    const version = await repository.apply({
      save: [a.clone({ index: 2 })],
      delete: [],
      bumpVersion: false,
    });

    expect(version).toBe(3);
    expect((await repository.findAll())[0].index).toBe(2);
  });

  it("changes nothing when an apply fails", async () => {
    const a = buildRule("a", 1);
    const repository = new FakeSchoolRuleRepository([a], 3);
    repository.failNextApply = true;

    await expect(
      repository.apply({ save: [], delete: [a.id], bumpVersion: true }),
    ).rejects.toThrow("apply failed");

    await expect(repository.getVersion()).resolves.toBe(3);
    await expect(repository.findAll()).resolves.toEqual([a]);
    await expect(
      repository.apply({ save: [], delete: [], bumpVersion: false }),
    ).resolves.toBe(3);
  });
});
