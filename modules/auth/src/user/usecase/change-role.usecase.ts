import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { USER_ROLES, UserRole } from "../model";
import {
  RoleChangeNotifier,
  SeatReleaser,
  TeachingReleaser,
  UserRepository,
} from "../provider";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

/** The changes an admin can make, one step each: an admin reaches student in two. */
const ALLOWED_CHANGES: Record<UserRole, readonly UserRole[]> = {
  student: ["instructor", "admin"],
  instructor: ["admin", "student"],
  admin: ["instructor"],
};

export interface ChangeRoleIn {
  actor: RegistrationActor;
  userId: string;
  /** Typed `unknown` because it comes straight from the request body. */
  role?: unknown;
}

export interface ChangeRoleOut {
  id: string;
  role: UserRole;
}

/**
 * An approved admin changes someone else's role. A student first gives up their upcoming seats and pending requests,
 * an instructor made a student first leaves their upcoming classes; a failed release fails the whole call (releases
 * are idempotent, so a retry is safe). The role is then written only while the stored role and status are the ones
 * read and an approved admin remains, and the person is told.
 */
export class ChangeRole implements UseCase<ChangeRoleIn, ChangeRoleOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly seatReleaser: SeatReleaser,
    private readonly teachingReleaser: TeachingReleaser,
    private readonly roleChangeNotifier: RoleChangeNotifier,
  ) {}

  async execute(input: ChangeRoleIn): Promise<ChangeRoleOut> {
    assertCanDecideRegistrations(input.actor);

    const role = this.toRole(input.role);

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError("user.notFound");
    }
    if (user.id === input.actor.id) {
      throw new ForbiddenError("user.role.self");
    }
    if (user.status !== "approved") {
      throw new ConflictError("user.status.notApproved");
    }
    if (!ALLOWED_CHANGES[user.role].includes(role)) {
      throw new ConflictError("user.role.changeNotAllowed");
    }

    const seatsReleased =
      user.role === "student" ? await this.seatReleaser.releaseSeats(user.id) : 0;
    const classesReleased =
      user.role === "instructor" && role === "student"
        ? await this.teachingReleaser.releaseUpcomingClasses(user.id, input.actor.id)
        : 0;

    const changed = user.clone({ role });
    changed.validate();

    const result = await this.userRepository.updateKeepingAnAdmin(changed, {
      role: user.role,
      status: user.status,
    });
    if (result === "changed") {
      throw new ConflictError("user.role.changeNotAllowed");
    }
    if (result === "lastAdmin") {
      throw new ConflictError("user.role.lastAdmin");
    }

    try {
      await this.roleChangeNotifier.roleChanged({
        userId: user.id,
        role,
        seatsReleased: seatsReleased > 0,
        classesReleased: classesReleased > 0,
      });
    } catch {
      // A failed notification never changes the answer; the adapter logs it.
    }

    return { id: user.id, role };
  }

  private toRole(role: unknown): UserRole {
    if (typeof role !== "string" || !(USER_ROLES as readonly string[]).includes(role)) {
      throw new ValidationException([new ValidationError("people.role.invalid")]);
    }

    return role as UserRole;
  }
}
