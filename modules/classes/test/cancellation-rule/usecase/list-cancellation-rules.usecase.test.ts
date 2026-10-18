import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListCancellationRules } from "../../../src";
import {
  ADMIN,
  buildCancellationRule,
  FakeCancellationRuleRepository,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const SURF = "O aluno pode cancelar até 12 horas antes.";

describe("ListCancellationRules", () => {
  it.each([ADMIN, INSTRUCTOR, STUDENT])("answers both rules to an approved $role", async (actor) => {
    const repository = new FakeCancellationRuleRepository([buildCancellationRule({ text: SURF })]);

    expect(await new ListCancellationRules(repository).execute({ actor })).toEqual({
      surf: SURF,
      skate: null,
    });
  });

  it("answers null for both when there is no rule", async () => {
    const useCase = new ListCancellationRules(new FakeCancellationRuleRepository());

    expect(await useCase.execute({ actor: STUDENT })).toEqual({ surf: null, skate: null });
  });

  it("refuses an account that isn't approved", async () => {
    const useCase = new ListCancellationRules(new FakeCancellationRuleRepository());

    for (const status of ["pending", "denied", "deleted", "removed"] as const) {
      const error = await useCase.execute({ actor: { ...STUDENT, status } }).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
    }
  });
});
