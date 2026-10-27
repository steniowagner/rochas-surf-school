import { ConflictError, NotFoundError, UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { AccountRemovalNotifier, UserRepository } from "../provider";
import { UUID_PATTERN } from "./pending-registration";
import { assertCanDecideRegistrations, RegistrationActor } from "./registration-access";
import { REMOVAL_WINDOW_MS } from "./removal-window";

export interface RestoreAccountIn {
  actor: RegistrationActor;
  userId: string;
}

export interface RestoreAccountOut {
  id: string;
  status: "approved";
}

/**
 * An approved admin brings a removed account back, with its role and history, within 30 days of its removal. The seats,
 * requests and classes the removal released stay released. The write is conditional on the account still being removed,
 * so of two restores at the same moment exactly one wins; the person is told only then.
 */
export class RestoreAccount implements UseCase<RestoreAccountIn, RestoreAccountOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
    private readonly accountRemovalNotifier: AccountRemovalNotifier,
  ) {}

  async execute(input: RestoreAccountIn): Promise<RestoreAccountOut> {
    assertCanDecideRegistrations(input.actor);

    const user = UUID_PATTERN.test(input.userId)
      ? await this.userRepository.findById(input.userId)
      : null;
    if (!user) {
      throw new NotFoundError("user.notFound");
    }
    if (user.status !== "removed") {
      throw new ConflictError("user.status.notRemoved");
    }
    if (
      !user.removedAt ||
      this.clock.now().getTime() - user.removedAt.getTime() >= REMOVAL_WINDOW_MS
    ) {
      throw new ConflictError("removal.window.ended");
    }

    const restored = user.clone({ status: "approved", removedAt: undefined });
    restored.validate();

    if (!(await this.userRepository.updateIfRemoved(restored))) {
      throw new ConflictError("user.status.notRemoved");
    }

    try {
      await this.accountRemovalNotifier.accountRestored(user.id);
    } catch {
      // A failed notification never changes the answer; the adapter logs it.
    }

    return { id: user.id, status: "approved" };
  }
}
