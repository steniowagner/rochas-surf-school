import { NotFoundError, UseCase } from "@rochas-surf-school/shared";
import { SchoolRuleRepository } from "../provider";
import { assertCanChangeSchoolRules, SchoolRuleActor } from "./school-rule-access";
import { SchoolRulesOut, toSchoolRulesOut } from "./school-rules.out";

export interface DeleteSchoolRuleIn {
  actor: SchoolRuleActor;
  ruleId: string;
}

export class DeleteSchoolRule
  implements UseCase<DeleteSchoolRuleIn, SchoolRulesOut>
{
  constructor(private readonly schoolRuleRepository: SchoolRuleRepository) {}

  async execute(input: DeleteSchoolRuleIn): Promise<SchoolRulesOut> {
    assertCanChangeSchoolRules(input.actor);

    const rule = await this.schoolRuleRepository.findById(input.ruleId);
    if (!rule) {
      throw new NotFoundError("schoolRule.id.notFound");
    }

    const current = await this.schoolRuleRepository.findAll();
    const movedUp = current
      .filter((item) => item.index > rule.index)
      .map((item) => item.clone({ index: item.index - 1 }));

    const version = await this.schoolRuleRepository.apply({
      save: movedUp,
      delete: [rule.id],
      bumpVersion: true,
    });

    return toSchoolRulesOut(version, await this.schoolRuleRepository.findAll());
  }
}
