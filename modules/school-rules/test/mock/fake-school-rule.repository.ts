import {
  SchoolRule,
  SchoolRuleChange,
  SchoolRuleRepository,
} from "../../src";

export class FakeSchoolRuleRepository implements SchoolRuleRepository {
  readonly applied: SchoolRuleChange[] = [];
  failNextApply = false;
  private rules: SchoolRule[];
  private version: number;

  constructor(rules: SchoolRule[] = [], version = 0) {
    this.rules = [...rules];
    this.version = version;
  }

  async findAll(): Promise<SchoolRule[]> {
    return [...this.rules].sort(
      (a, b) =>
        a.index - b.index || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async findById(id: string): Promise<SchoolRule | null> {
    return this.rules.find((item) => item.id === id) ?? null;
  }

  async getVersion(): Promise<number> {
    return this.version;
  }

  async apply(change: SchoolRuleChange): Promise<number> {
    if (this.failNextApply) {
      this.failNextApply = false;
      throw new Error("apply failed");
    }

    let rules = this.rules.filter((item) => !change.delete.includes(item.id));
    for (const rule of change.save) {
      rules = rules.some((item) => item.id === rule.id)
        ? rules.map((item) => (item.id === rule.id ? rule : item))
        : [...rules, rule];
    }

    this.rules = rules;
    this.applied.push(change);
    if (change.bumpVersion) {
      this.version += 1;
    }

    return this.version;
  }
}
