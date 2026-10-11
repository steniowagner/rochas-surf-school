import { ValidationException } from "@rochas-surf-school/shared";
import { ReorderSchoolRules } from "../../../src";
import { ADMIN, buildRule, FakeSchoolRuleRepository, STUDENT } from "../../mock";

function setup() {
  const [a, b, c] = [buildRule("a", 1), buildRule("b", 2), buildRule("c", 3)];
  const repository = new FakeSchoolRuleRepository([a, b, c], 9);
  return { a, b, c, repository, useCase: new ReorderSchoolRules(repository) };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("ReorderSchoolRules", () => {
  it("applies the new order and keeps the version", async () => {
    const { a, b, c, repository, useCase } = setup();

    const out = await useCase.execute({ actor: ADMIN, ruleIds: [c.id, a.id, b.id] });

    expect(out.version).toBe(9);
    expect(out.rules.map((item) => [item.title, item.index])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
    expect(repository.applied[0]).toMatchObject({ delete: [], bumpVersion: false });
  });

  it("saves only the rules whose position changed", async () => {
    const { a, b, c, repository, useCase } = setup();

    await useCase.execute({ actor: ADMIN, ruleIds: [a.id, c.id, b.id] });

    expect(repository.applied[0].save.map((item) => item.title).sort()).toEqual(["b", "c"]);
  });

  it("changes nothing when the order is the current one", async () => {
    const { a, b, c, repository, useCase } = setup();

    const out = await useCase.execute({ actor: ADMIN, ruleIds: [a.id, b.id, c.id] });

    expect(out.version).toBe(9);
    expect(out.rules.map((item) => item.index)).toEqual([1, 2, 3]);
    expect(repository.applied).toHaveLength(0);
  });

  it("accepts an empty list when there are no rules", async () => {
    const useCase = new ReorderSchoolRules(new FakeSchoolRuleRepository());

    await expect(useCase.execute({ actor: ADMIN, ruleIds: [] })).resolves.toEqual({
      version: 0,
      rules: [],
    });
  });

  it.each([
    ["misses a rule", (ids: string[]) => ids.slice(0, 2)],
    ["repeats a rule", (ids: string[]) => [ids[0], ids[0], ids[1], ids[2]]],
    ["repeats a rule instead of another", (ids: string[]) => [ids[0], ids[0], ids[1]]],
    ["names an unknown id", (ids: string[]) => [...ids, "unknown"]],
    ["swaps a rule for an unknown id", (ids: string[]) => [ids[0], ids[1], "unknown"]],
  ])("refuses a list that %s with schoolRule.order.mismatch", async (_name, build) => {
    const { a, b, c, repository, useCase } = setup();

    const messages = await errorsOf(
      useCase.execute({ actor: ADMIN, ruleIds: build([a.id, b.id, c.id]) }),
    );

    expect(messages).toEqual(["schoolRule.order.mismatch"]);
    expect(repository.applied).toHaveLength(0);
  });

  it.each([undefined, null, "a,b", { 0: "a" }, [1, 2, 3], ["a", null]])(
    "refuses ruleIds %j with schoolRule.order.required",
    async (ruleIds) => {
      const { repository, useCase } = setup();

      const messages = await errorsOf(
        useCase.execute({ actor: ADMIN, ruleIds: ruleIds as never }),
      );

      expect(messages).toEqual(["schoolRule.order.required"]);
      expect(repository.applied).toHaveLength(0);
    },
  );

  it("refuses a non-admin with schoolRule.role.notAdmin (permission)", async () => {
    const { a, b, c, repository, useCase } = setup();

    await expect(
      useCase.execute({ actor: STUDENT, ruleIds: [c.id, b.id, a.id] }),
    ).rejects.toMatchObject({ message: "schoolRule.role.notAdmin", statusCode: 403 });
    expect(repository.applied).toHaveLength(0);
  });
});
