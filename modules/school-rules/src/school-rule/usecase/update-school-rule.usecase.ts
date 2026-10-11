import { NotFoundError, UseCase } from "@rochas-surf-school/shared";
import { SchoolRuleRepository } from "../provider";
import { assertCanChangeSchoolRules, SchoolRuleActor } from "./school-rule-access";
import { normalizeSchoolRuleText } from "./school-rule-text";
import { SchoolRulesOut, toSchoolRulesOut } from "./school-rules.out";

export interface UpdateSchoolRuleIn {
  actor: SchoolRuleActor;
  ruleId: string;
  title: string;
  description: string;
}

export class UpdateSchoolRule
  implements UseCase<UpdateSchoolRuleIn, SchoolRulesOut>
{
  constructor(private readonly schoolRuleRepository: SchoolRuleRepository) {}

  async execute(input: UpdateSchoolRuleIn): Promise<SchoolRulesOut> {
    assertCanChangeSchoolRules(input.actor);

    const rule = await this.schoolRuleRepository.findById(input.ruleId);
    if (!rule) {
      throw new NotFoundError("schoolRule.id.notFound");
    }

    const title = normalizeSchoolRuleText(input.title);
    const description = normalizeSchoolRuleText(input.description);
    const updated = rule.clone({ title, description });
    updated.validate();

    if (title === rule.title && description === rule.description) {
      return toSchoolRulesOut(
        await this.schoolRuleRepository.getVersion(),
        await this.schoolRuleRepository.findAll(),
      );
    }

    const version = await this.schoolRuleRepository.apply({
      save: [updated],
      delete: [],
      bumpVersion: true,
    });

    return toSchoolRulesOut(version, await this.schoolRuleRepository.findAll());
  }
}
