import {
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { CLASS_DISCIPLINES, ClassDiscipline } from "../../school-class/model/class-limits";
import { ClockProvider } from "../../school-class/provider/clock.provider";
import { CancellationRule } from "../model";
import { CancellationRuleRepository } from "../provider";
import { CancellationRulesOut, toCancellationRulesOut } from "./cancellation-rules.out";

export interface SaveCancellationRuleIn {
  actor: ClassActor;
  discipline: unknown;
  text: unknown;
}

export class SaveCancellationRule
  implements UseCase<SaveCancellationRuleIn, CancellationRulesOut>
{
  constructor(
    private readonly cancellationRuleRepository: CancellationRuleRepository,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: SaveCancellationRuleIn): Promise<CancellationRulesOut> {
    assertCanManageClasses(input.actor);

    if (!CLASS_DISCIPLINES.includes(input.discipline as ClassDiscipline)) {
      throw new ValidationException([new ValidationError("cancellationRule.discipline.invalid")]);
    }

    const discipline = input.discipline as ClassDiscipline;
    const now = this.clockProvider.now();
    const rules = await this.cancellationRuleRepository.findAll();
    const stored = rules.find((rule) => rule.discipline === discipline);

    const rule = new CancellationRule({
      id: stored?.id,
      discipline,
      text: typeof input.text === "string" ? input.text : "",
      updatedBy: input.actor.id,
      updatedAt: now,
    });
    rule.validate();

    if (stored?.text === rule.text) {
      return toCancellationRulesOut(rules);
    }

    await this.cancellationRuleRepository.save(rule, now);

    return toCancellationRulesOut(await this.cancellationRuleRepository.findAll());
  }
}
