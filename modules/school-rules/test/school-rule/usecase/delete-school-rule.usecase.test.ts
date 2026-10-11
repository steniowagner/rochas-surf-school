import { DeleteSchoolRule } from "../../../src";
import { ADMIN, buildRule, FakeSchoolRuleRepository, STUDENT } from "../../mock";

function setup(count = 4) {
  const rules = Array.from({ length: count }, (_, i) =>
    buildRule(String.fromCharCode(97 + i), i + 1),
  );
  const repository = new FakeSchoolRuleRepository(rules, 3);
  return { rules, repository, useCase: new DeleteSchoolRule(repository) };
}

describe("DeleteSchoolRule", () => {
  it("deletes a middle rule, moves the next ones up and raises the version", async () => {
    const { rules, repository, useCase } = setup();

    const out = await useCase.execute({ actor: ADMIN, ruleId: rules[1].id });

    expect(out.version).toBe(4);
    expect(out.rules.map((item) => [item.title, item.index])).toEqual([
      ["a", 1],
      ["c", 2],
      ["d", 3],
    ]);
    await expect(repository.findById(rules[1].id)).resolves.toBeNull();
  });

  it("leaves the other indexes alone when the last rule is deleted", async () => {
    const { rules, useCase } = setup();

    const out = await useCase.execute({ actor: ADMIN, ruleId: rules[3].id });

    expect(out.version).toBe(4);
    expect(out.rules.map((item) => [item.title, item.index])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("leaves no rules when the only rule is deleted", async () => {
    const { rules, useCase } = setup(1);

    const out = await useCase.execute({ actor: ADMIN, ruleId: rules[0].id });

    expect(out).toEqual({ version: 4, rules: [] });
  });

  it("refuses an unknown id with schoolRule.id.notFound", async () => {
    const { repository, useCase } = setup();

    await expect(
      useCase.execute({ actor: ADMIN, ruleId: "missing" }),
    ).rejects.toMatchObject({ message: "schoolRule.id.notFound", statusCode: 404 });
    expect(repository.applied).toHaveLength(0);
  });

  it("refuses a non-admin with schoolRule.role.notAdmin (permission)", async () => {
    const { rules, repository, useCase } = setup();

    await expect(
      useCase.execute({ actor: STUDENT, ruleId: rules[0].id }),
    ).rejects.toMatchObject({ message: "schoolRule.role.notAdmin", statusCode: 403 });
    expect(repository.applied).toHaveLength(0);
  });
});
