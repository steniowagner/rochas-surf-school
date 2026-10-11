import { ValidationException } from "@rochas-surf-school/shared";
import { CreateSchoolRule } from "../../../src";
import { ADMIN, buildRule, FakeSchoolRuleRepository, STUDENT } from "../../mock";

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("CreateSchoolRule", () => {
  it("creates the first rule at index 1 and moves the version to 1", async () => {
    const repository = new FakeSchoolRuleRepository();
    const useCase = new CreateSchoolRule(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      title: "Chega 15 min antes",
      description: "Tempo para vestir o fato.",
    });

    expect(out.version).toBe(1);
    expect(out.rules).toEqual([
      {
        id: expect.any(String),
        title: "Chega 15 min antes",
        description: "Tempo para vestir o fato.",
        index: 1,
      },
    ]);
  });

  it("appends the rule last, trims the text and stores the creator", async () => {
    const repository = new FakeSchoolRuleRepository(
      [buildRule("a", 1), buildRule("b", 2)],
      4,
    );
    const useCase = new CreateSchoolRule(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      title: "  Chega 15 min antes ",
      description: " Tempo para vestir o fato. ",
    });

    expect(out.version).toBe(5);
    expect(out.rules.map((item) => [item.title, item.index])).toEqual([
      ["a", 1],
      ["b", 2],
      ["Chega 15 min antes", 3],
    ]);
    expect(out.rules[2].description).toBe("Tempo para vestir o fato.");
    const saved = await repository.findById(out.rules[2].id);
    expect(saved?.createdBy).toBe(ADMIN.id);
  });

  it.each([
    [{ title: "", description: "ok" }, ["schoolRule.title.required"]],
    [{ title: "   ", description: "ok" }, ["schoolRule.title.required"]],
    [{ title: "a".repeat(61), description: "ok" }, ["schoolRule.title.max.length"]],
    [{ title: "ok", description: "" }, ["schoolRule.description.required"]],
    [{ title: "ok", description: "b".repeat(301) }, ["schoolRule.description.max.length"]],
    [{ title: undefined, description: undefined }, [
      "schoolRule.title.required",
      "schoolRule.description.required",
    ]],
  ])("refuses invalid text %j and changes nothing", async (body, keys) => {
    const repository = new FakeSchoolRuleRepository([buildRule("a", 1)], 2);
    const useCase = new CreateSchoolRule(repository);

    const messages = await errorsOf(
      useCase.execute({ actor: ADMIN, ...(body as { title: string; description: string }) }),
    );

    expect(messages).toEqual(keys);
    expect(repository.applied).toHaveLength(0);
    await expect(repository.getVersion()).resolves.toBe(2);
  });

  it("accepts the limits: 60 and 300 characters after trimming", async () => {
    const useCase = new CreateSchoolRule(new FakeSchoolRuleRepository());

    const out = await useCase.execute({
      actor: ADMIN,
      title: ` ${"a".repeat(60)} `,
      description: ` ${"b".repeat(300)} `,
    });

    expect(out.rules[0].title).toHaveLength(60);
    expect(out.rules[0].description).toHaveLength(300);
  });

  it("refuses a non-admin with schoolRule.role.notAdmin (permission)", async () => {
    const repository = new FakeSchoolRuleRepository();
    const useCase = new CreateSchoolRule(repository);

    await expect(
      useCase.execute({ actor: STUDENT, title: "ok", description: "ok" }),
    ).rejects.toMatchObject({ message: "schoolRule.role.notAdmin", statusCode: 403 });
    expect(repository.applied).toHaveLength(0);
  });

  it("refuses an admin that is not approved with user.status.notApproved (permission)", async () => {
    const useCase = new CreateSchoolRule(new FakeSchoolRuleRepository());

    await expect(
      useCase.execute({
        actor: { ...ADMIN, status: "pending" },
        title: "ok",
        description: "ok",
      }),
    ).rejects.toMatchObject({ message: "user.status.notApproved", statusCode: 403 });
  });
});
