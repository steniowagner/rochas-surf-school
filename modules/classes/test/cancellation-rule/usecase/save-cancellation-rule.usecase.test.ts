import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { SaveCancellationRule } from "../../../src";
import {
  ADMIN,
  buildCancellationRule,
  FakeCancellationRuleRepository,
  FakeClockProvider,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-18T12:00:00.000Z");

function build(rules = [buildCancellationRule({ text: "Surf antigo." })]) {
  const repository = new FakeCancellationRuleRepository(rules);

  return {
    repository,
    useCase: new SaveCancellationRule(repository, new FakeClockProvider(NOW)),
  };
}

async function keysOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("SaveCancellationRule", () => {
  it("stores the trimmed text and answers both rules", async () => {
    const { repository, useCase } = build();

    const out = await useCase.execute({
      actor: ADMIN,
      discipline: "skate",
      text: "  Até 6 horas antes do início.  ",
    });

    expect(out).toEqual({ surf: "Surf antigo.", skate: "Até 6 horas antes do início." });
    expect(repository.saveCalls).toHaveLength(1);
    expect(repository.saveCalls[0].now).toEqual(NOW);
    expect(repository.saveCalls[0].rule.updatedBy).toBe(ADMIN.id);
  });

  it("replaces the text: the last save wins", async () => {
    const { repository, useCase } = build();

    await useCase.execute({ actor: ADMIN, discipline: "surf", text: "Primeira." });
    const out = await useCase.execute({ actor: ADMIN, discipline: "surf", text: "Segunda." });

    expect(out.surf).toBe("Segunda.");
    expect(await repository.findAll()).toHaveLength(1);
  });

  describe("clears the deadlines", () => {
    it("saves, and so clears, when the text differs or is the first rule", async () => {
      const { repository, useCase } = build([]);

      await useCase.execute({ actor: ADMIN, discipline: "surf", text: "Nova." });
      await useCase.execute({ actor: ADMIN, discipline: "surf", text: "Outra." });

      expect(repository.saveCalls.map((call) => call.rule.text)).toEqual(["Nova.", "Outra."]);
    });

    it("writes nothing when the trimmed text is the stored one", async () => {
      const { repository, useCase } = build();

      const out = await useCase.execute({ actor: ADMIN, discipline: "surf", text: "  Surf antigo.\n" });

      expect(out).toEqual({ surf: "Surf antigo.", skate: null });
      expect(repository.saveCalls).toHaveLength(0);
    });
  });

  it.each([
    ["kitesurf", "x", ["cancellationRule.discipline.invalid"]],
    [undefined, "x", ["cancellationRule.discipline.invalid"]],
    ["surf", undefined, ["cancellationRule.text.required"]],
    ["surf", null, ["cancellationRule.text.required"]],
    ["surf", 5, ["cancellationRule.text.required"]],
    ["surf", "   ", ["cancellationRule.text.required"]],
    ["surf", `${"a".repeat(2001)} `, ["cancellationRule.text.max.length"]],
  ])("refuses %# and stores nothing", async (discipline, text, keys) => {
    const { repository, useCase } = build();

    expect(await keysOf(useCase.execute({ actor: ADMIN, discipline, text }))).toEqual(keys);
    expect(repository.saveCalls).toHaveLength(0);
  });

  it("accepts 2000 characters", async () => {
    const { useCase } = build();

    const out = await useCase.execute({ actor: ADMIN, discipline: "surf", text: "a".repeat(2000) });

    expect(out.surf).toHaveLength(2000);
  });

  it("refuses accounts that are not approved admins", async () => {
    const { repository, useCase } = build();
    const input = { discipline: "surf", text: "Nova." };

    const pending = await useCase.execute({ actor: { ...ADMIN, status: "pending" }, ...input }).catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, ...input }).catch((e) => e);
    const instructor = await useCase.execute({ actor: INSTRUCTOR, ...input }).catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(instructor.message).toBe("user.role.notAdmin");
    expect(repository.saveCalls).toHaveLength(0);
  });
});
