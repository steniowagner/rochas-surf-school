import { UseCase } from "@rochas-surf-school/shared";
import { SchoolRuleRepository } from "../provider";
import { assertCanReadSchoolRules, SchoolRuleActor } from "./school-rule-access";
import { SchoolRulesOut, toSchoolRulesOut } from "./school-rules.out";

export interface ListSchoolRulesIn {
  actor: SchoolRuleActor;
}

export class ListSchoolRules
  implements UseCase<ListSchoolRulesIn, SchoolRulesOut>
{
  constructor(private readonly schoolRuleRepository: SchoolRuleRepository) {}

  async execute(input: ListSchoolRulesIn): Promise<SchoolRulesOut> {
    assertCanReadSchoolRules(input.actor);

    const [version, rules] = await Promise.all([
      this.schoolRuleRepository.getVersion(),
      this.schoolRuleRepository.findAll(),
    ]);

    return toSchoolRulesOut(version, rules);
  }
}
