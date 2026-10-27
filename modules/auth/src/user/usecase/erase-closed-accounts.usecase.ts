import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { PersonNotificationEraser, UserRepository } from "../provider";

const ERASURE_DELAY_MS = 30 * 24 * 60 * 60 * 1000;

export interface EraseClosedAccountsOut {
  /** How many accounts were erased. */
  erased: number;
}

/**
 * Erases the accounts deleted or removed 30 days ago or more, keeping each as an anonymous record. The
 * notifications about them go first: while a step fails the accounts are still there, so the next run retries them.
 */
export class EraseClosedAccounts implements UseCase<void, EraseClosedAccountsOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personNotificationEraser: PersonNotificationEraser,
    private readonly clock: ClockProvider,
  ) {}

  async execute(): Promise<EraseClosedAccountsOut> {
    const cutoff = new Date(this.clock.now().getTime() - ERASURE_DELAY_MS);
    const ids = await this.userRepository.findClosedBefore(cutoff);
    if (ids.length === 0) {
      return { erased: 0 };
    }

    await this.personNotificationEraser.erase(ids);
    const erased = await this.userRepository.eraseClosed(ids, cutoff);

    return { erased };
  }
}
