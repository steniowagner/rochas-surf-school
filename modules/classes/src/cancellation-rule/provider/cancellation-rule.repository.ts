import { CancellationRule } from "../model";

export interface CancellationRuleRepository {
  /** The saved rules, one per discipline that has one. */
  findAll(): Promise<CancellationRule[]>;
  /**
   * Stores the rule, replacing the one of its discipline, and, in the same atomic write, clears the
   * cancellation deadline of every class of that discipline that starts after `now` and isn't cancelled.
   */
  save(rule: CancellationRule, now: Date): Promise<void>;
}
