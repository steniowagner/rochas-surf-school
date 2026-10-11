import {
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SchoolRuleRepository } from "../provider";
import { assertCanChangeSchoolRules, SchoolRuleActor } from "./school-rule-access";
import { SchoolRulesOut, toSchoolRulesOut } from "./school-rules.out";

export interface ReorderSchoolRulesIn {
  actor: SchoolRuleActor;
  ruleIds: string[];
}

function isListOfStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export class ReorderSchoolRules
  implements UseCase<ReorderSchoolRulesIn, SchoolRulesOut>
{
  constructor(private readonly schoolRuleRepository: SchoolRuleRepository) {}

  async execute(input: ReorderSchoolRulesIn): Promise<SchoolRulesOut> {
    assertCanChangeSchoolRules(input.actor);

    if (!isListOfStrings(input.ruleIds)) {
      throw new ValidationException([
        new ValidationError("schoolRule.order.required"),
      ]);
    }

    const current = await this.schoolRuleRepository.findAll();
    const currentIds = new Set(current.map((item) => item.id));
    const sentIds = new Set(input.ruleIds);
    const matches =
      input.ruleIds.length === current.length &&
      sentIds.size === currentIds.size &&
      input.ruleIds.every((id) => currentIds.has(id));
    if (!matches) {
      throw new ValidationException([
        new ValidationError("schoolRule.order.mismatch"),
      ]);
    }

    const byId = new Map(current.map((item) => [item.id, item]));
    const moved = input.ruleIds.flatMap((id, position) => {
      const rule = byId.get(id)!;
      return rule.index === position + 1
        ? []
        : [rule.clone({ index: position + 1 })];
    });

    const version =
      moved.length === 0
        ? await this.schoolRuleRepository.getVersion()
        : await this.schoolRuleRepository.apply({
            save: moved,
            delete: [],
            bumpVersion: false,
          });

    return toSchoolRulesOut(version, await this.schoolRuleRepository.findAll());
  }
}
