import { ConflictError, ForbiddenError, NotFoundError, UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import {
  AccountRemovalNotifier,
  SeatReleaser,
  TeachingReleaser,
  UserRepository,
} from "../provider";
import { UUID_PATTERN } from "./pending-registration";
import { assertCanDecideRegistrations, RegistrationActor } from "./registration-access";

export interface RemoveUserIn {
  actor: RegistrationActor;
  userId: string;
}

export interface RemoveUserOut {
  id: string;
  status: "removed";
}

/**
 * An approved admin removes another approved member. The account gives up its upcoming seats and pending requests,
 * then its upcoming classes (with the admin as actor), as a deletion does; a failed release fails the whole call
 * (releases are idempotent, so a retry is safe). The status is then written only while the stored role and status are
 * the ones read and an approved admin remains, and the person is told. Sessions and push tokens stay: the person
 * signs in to see "Access removed", and the phone is how a restore reaches them.
 */
export class RemoveUser implements UseCase<RemoveUserIn, RemoveUserOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
    private readonly seatReleaser: SeatReleaser,
    private readonly teachingReleaser: TeachingReleaser,
    private readonly accountRemovalNotifier: AccountRemovalNotifier,
  ) {}

  async execute(input: RemoveUserIn): Promise<RemoveUserOut> {
    assertCanDecideRegistrations(input.actor);

    // An id that isn't a UUID can't name anyone (and the database would refuse to compare it).
    const user = UUID_PATTERN.test(input.userId)
      ? await this.userRepository.findById(input.userId)
      : null;
    if (!user) {
      throw new NotFoundError("user.notFound");
    }
    if (user.id === input.actor.id) {
      throw new ForbiddenError("user.remove.self");
    }
    if (user.status !== "approved") {
      throw new ConflictError("user.status.notApproved");
    }

    await this.seatReleaser.releaseSeats(user.id);
    await this.teachingReleaser.releaseUpcomingClasses(user.id, input.actor.id);

    const removed = user.clone({ status: "removed", removedAt: this.clock.now() });
    removed.validate();

    // Two admins removing each other at once can't both go: the write keeps an approved admin.
    const result = await this.userRepository.updateKeepingAnAdmin(removed, {
      role: user.role,
      status: user.status,
    });
    if (result === "changed") {
      throw new ConflictError("user.status.notApproved");
    }
    if (result === "lastAdmin") {
      throw new ConflictError("user.role.lastAdmin");
    }

    try {
      await this.accountRemovalNotifier.accountRemoved(user.id);
    } catch {
      // A failed notification never changes the answer; the adapter logs it.
    }

    return { id: user.id, status: "removed" };
  }
}
