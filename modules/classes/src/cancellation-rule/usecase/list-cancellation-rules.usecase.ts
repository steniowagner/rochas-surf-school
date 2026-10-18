import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { CancellationRuleRepository } from "../provider";
import { CancellationRulesOut, toCancellationRulesOut } from "./cancellation-rules.out";

export interface ListCancellationRulesIn {
  actor: ClassActor;
}

export class ListCancellationRules
  implements UseCase<ListCancellationRulesIn, CancellationRulesOut>
{
  constructor(private readonly cancellationRuleRepository: CancellationRuleRepository) {}

  async execute(input: ListCancellationRulesIn): Promise<CancellationRulesOut> {
    assertCanReadClasses(input.actor);

    return toCancellationRulesOut(await this.cancellationRuleRepository.findAll());
  }
}
