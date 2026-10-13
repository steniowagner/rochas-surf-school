import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { RegistrationNotificationEraser, UserRepository } from "../provider";

const ERASURE_DELAY_MS = 30 * 24 * 60 * 60 * 1000;

export interface EraseDeniedRegistrationsOut {
  /** How many users were deleted. */
  erased: number;
}

/**
 * Erases the registrations denied 30 days ago or more, with everything that hangs off them. The
 * notifications go first: while a step fails the users are still there, so the next run retries them.
 */
export class EraseDeniedRegistrations implements UseCase<void, EraseDeniedRegistrationsOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly registrationNotificationEraser: RegistrationNotificationEraser,
    private readonly clock: ClockProvider,
  ) {}

  async execute(): Promise<EraseDeniedRegistrationsOut> {
    const cutoff = new Date(this.clock.now().getTime() - ERASURE_DELAY_MS);
    const ids = await this.userRepository.findDeniedBefore(cutoff);
    if (ids.length === 0) {
      return { erased: 0 };
    }

    await this.registrationNotificationEraser.erase(ids);
    const erased = await this.userRepository.deleteDenied(ids);

    return { erased };
  }
}
