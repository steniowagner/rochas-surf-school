import {
  Entity,
  EntityState,
  InRule,
  MaxLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";
import { CLASS_DISCIPLINES, ClassDiscipline } from "../../school-class/model/class-limits";

export const CANCELLATION_RULE_TEXT_MAX = 2000;

export interface CancellationRuleState extends EntityState {
  discipline: ClassDiscipline;
  text: string;
  updatedBy: string;
}

/** The free-text cancellation rule of one discipline, written by admins. */
export class CancellationRule extends Entity<CancellationRuleState> {
  constructor(props: CancellationRuleState) {
    super({ ...props, text: props.text.trim() });
  }

  get discipline(): ClassDiscipline {
    return this.props.discipline;
  }

  get text(): string {
    return this.props.text;
  }

  get updatedBy(): string {
    return this.props.updatedBy;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "cancellationRule.discipline",
        value: this.discipline,
        rules: [new RequiredRule(), new InRule(CLASS_DISCIPLINES)],
      },
      {
        code: "cancellationRule.text",
        value: this.text,
        rules: [new RequiredRule(), new MaxLengthRule(CANCELLATION_RULE_TEXT_MAX)],
      },
      {
        code: "cancellationRule.updatedBy",
        value: this.updatedBy,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
