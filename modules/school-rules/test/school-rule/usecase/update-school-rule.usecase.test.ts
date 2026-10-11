import { ValidationException } from "@rochas-surf-school/shared";
import { UpdateSchoolRule } from "../../../src";
import { ADMIN, buildRule, FakeSchoolRuleRepository, STUDENT } from "../../mock";

describe("UpdateSchoolRule", () => {
  function setup() {
    const a = buildRule("a", 1);
    const b = buildRule("b", 2);
    const c = buildRule("c", 3);
    const repository = new FakeSchoolRuleRepository([a, b, c], 5);
    return { a, b, c, repository, useCase: new UpdateSchoolRule(repository) };
  }

  it("saves the trimmed text, keeps the index and raises the version", async () => {
    const { a, b, c, repository, useCase } = setup();

    const out = await useCase.execute({
      actor: ADMIN,
      ruleId: b.id,
      title: "  novo título ",
      description: " nova explicação ",
    });

    expect(out.version).toBe(6);
    expect(out.rules).toEqual([
      { id: a.id, title: "a", description: "a description", index: 1 },
      { id: b.id, title: "novo título", description: "nova explicação", index: 2 },
      { id: c.id, title: "c", description: "c description", index: 3 },
    ]);
    expect(repository.applied).toHaveLength(1);
  });

  it("raises the version when only one of the two fields changes", async () => {
    const { b, useCase } = setup();

    const out = await useCase.execute({
      actor: ADMIN,
      ruleId: b.id,
      title: "b",
      description: "changed",
    });

    expect(out.version).toBe(6);
  });

  it("answers the current list and keeps the version when nothing changed", async () => {
    const { a, b, c, repository, useCase } = setup();

    const out = await useCase.execute({
      actor: ADMIN,
      ruleId: b.id,
      title: " b ",
      description: "b description  ",
    });

    expect(out.version).toBe(5);
    expect(out.rules.map((item) => item.id)).toEqual([a.id, b.id, c.id]);
    expect(repository.applied).toHaveLength(0);
  });

  it("refuses an unknown id with schoolRule.id.notFound", async () => {
    const { repository, useCase } = setup();

    await expect(
      useCase.execute({ actor: ADMIN, ruleId: "missing", title: "x", description: "y" }),
    ).rejects.toMatchObject({ message: "schoolRule.id.notFound", statusCode: 404 });
    expect(repository.applied).toHaveLength(0);
  });

  it.each([
    [{ title: "", description: "ok" }, ["schoolRule.title.required"]],
    [{ title: "a".repeat(61), description: "ok" }, ["schoolRule.title.max.length"]],
    [{ title: "ok", description: "   " }, ["schoolRule.description.required"]],
    [{ title: "ok", description: "b".repeat(301) }, ["schoolRule.description.max.length"]],
    [{ title: "", description: "" }, [
      "schoolRule.title.required",
      "schoolRule.description.required",
    ]],
  ])("refuses invalid text %j and changes nothing", async (body, keys) => {
    const { b, repository, useCase } = setup();

    const error = (await useCase
      .execute({ actor: ADMIN, ruleId: b.id, ...body })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual(keys);
    expect(repository.applied).toHaveLength(0);
    await expect(repository.getVersion()).resolves.toBe(5);
  });

  it("refuses a non-admin with schoolRule.role.notAdmin (permission)", async () => {
    const { b, repository, useCase } = setup();

    await expect(
      useCase.execute({ actor: STUDENT, ruleId: b.id, title: "x", description: "y" }),
    ).rejects.toMatchObject({ message: "schoolRule.role.notAdmin", statusCode: 403 });
    expect(repository.applied).toHaveLength(0);
  });
});
