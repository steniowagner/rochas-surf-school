import { UseCase } from "@rochas-surf-school/shared";
import { SchoolRule } from "../model";
import { SchoolRuleRepository } from "../provider";
import { assertCanChangeSchoolRules, SchoolRuleActor } from "./school-rule-access";
import { normalizeSchoolRuleText } from "./school-rule-text";
import { SchoolRulesOut, toSchoolRulesOut } from "./school-rules.out";

export interface CreateSchoolRuleIn {
  actor: SchoolRuleActor;
  title: string;
  description: string;
}

export class CreateSchoolRule
  implements UseCase<CreateSchoolRuleIn, SchoolRulesOut>
{
  constructor(private readonly schoolRuleRepository: SchoolRuleRepository) {}

  async execute(input: CreateSchoolRuleIn): Promise<SchoolRulesOut> {
    assertCanChangeSchoolRules(input.actor);

    const current = await this.schoolRuleRepository.findAll();
    const rule = new SchoolRule({
      title: normalizeSchoolRuleText(input.title),
      description: normalizeSchoolRuleText(input.description),
      index: current.length + 1,
      createdBy: input.actor.id,
    });
    rule.validate();

    const version = await this.schoolRuleRepository.apply({
      save: [rule],
      delete: [],
      bumpVersion: true,
    });

    return toSchoolRulesOut(version, await this.schoolRuleRepository.findAll());
  }
}
