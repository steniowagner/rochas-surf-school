import { CancellationRule, CancellationRuleRepository } from "../../src";

export class FakeCancellationRuleRepository implements CancellationRuleRepository {
  /** Every save, which is also every clearing of the deadlines of that discipline's upcoming classes. */
  readonly saveCalls: { rule: CancellationRule; now: Date }[] = [];
  private rules: CancellationRule[];

  constructor(rules: CancellationRule[] = []) {
    this.rules = [...rules];
  }

  async findAll(): Promise<CancellationRule[]> {
    return [...this.rules];
  }

  async save(rule: CancellationRule, now: Date): Promise<void> {
    this.saveCalls.push({ rule, now });
    this.rules = [...this.rules.filter((item) => item.discipline !== rule.discipline), rule];
  }
}
