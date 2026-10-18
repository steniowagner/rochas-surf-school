import {
  ForbiddenError,
  UnauthorizedError,
  UseCase,
} from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { TeachingReleaser, UserRepository } from "../provider";

export interface DeleteAccountIn {
  userId: string;
}

/**
 * An approved person closes their own account; it can be reactivated until it is erased (30 days). Their upcoming
 * classes are released first, so a deleted account never teaches one; a failed release fails the whole call.
 */
export class DeleteAccount implements UseCase<DeleteAccountIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
    private readonly teachingReleaser: TeachingReleaser,
  ) {}

  async execute(input: DeleteAccountIn): Promise<void> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    await this.teachingReleaser.releaseUpcomingClasses(user.id);

    const deleted = user.clone({ status: "deleted", deletedAt: this.clock.now() });
    deleted.validate();
    await this.userRepository.update(deleted);
  }
}
