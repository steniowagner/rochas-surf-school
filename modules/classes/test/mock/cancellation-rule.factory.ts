import { CancellationRule, CancellationRuleState } from "../../src";
import { ADMIN } from "./location.factory";

export function buildCancellationRule(
  overrides: Partial<CancellationRuleState> = {},
): CancellationRule {
  return new CancellationRule({
    discipline: "surf",
    text: "O aluno pode cancelar até 12 horas antes do início da aula.",
    updatedBy: ADMIN.id,
    ...overrides,
  });
}
