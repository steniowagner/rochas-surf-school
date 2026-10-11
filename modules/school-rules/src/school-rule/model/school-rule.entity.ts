import {
  Entity,
  EntityState,
  IntegerRule,
  MaxLengthRule,
  PositiveRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";

export const SCHOOL_RULE_TITLE_MAX_LENGTH = 60;
export const SCHOOL_RULE_DESCRIPTION_MAX_LENGTH = 300;

export interface SchoolRuleState extends EntityState {
  title: string;
  description: string;
  index: number;
  createdBy?: string;
}

export class SchoolRule extends Entity<SchoolRuleState> {
  constructor(props: SchoolRuleState) {
    super(props);
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get index(): number {
    return this.props.index;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "schoolRule.title",
        value: this.title,
        rules: [
          new RequiredRule(),
          new MaxLengthRule(SCHOOL_RULE_TITLE_MAX_LENGTH),
        ],
      },
      {
        code: "schoolRule.description",
        value: this.description,
        rules: [
          new RequiredRule(),
          new MaxLengthRule(SCHOOL_RULE_DESCRIPTION_MAX_LENGTH),
        ],
      },
      {
        code: "schoolRule.index",
        value: this.index,
        rules: [new RequiredRule(), new IntegerRule(), new PositiveRule()],
      },
      {
        code: "schoolRule.createdBy",
        value: this.createdBy,
        rules: [new UuidRule()],
      },
    ]);
  }
}
