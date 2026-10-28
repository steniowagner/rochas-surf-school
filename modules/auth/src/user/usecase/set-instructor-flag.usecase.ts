import {
  ConflictError,
  NotFoundError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { UserRepository } from "../provider";
import { UUID_PATTERN } from "./pending-registration";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface SetInstructorFlagIn {
  actor: RegistrationActor;
  userId: string;
  /** Typed `unknown` because it comes straight from the request body. */
  isInstructor?: unknown;
}

export interface SetInstructorFlagOut {
  id: string;
  isInstructor: boolean;
}

/**
 * An approved admin switches whether an approved admin (themselves included) can also be assigned to teach. The flag is
 * written only while the stored role and status are the ones read; nobody is notified, and nobody is taken off a class.
 */
export class SetInstructorFlag
  implements UseCase<SetInstructorFlagIn, SetInstructorFlagOut>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SetInstructorFlagIn): Promise<SetInstructorFlagOut> {
    assertCanDecideRegistrations(input.actor);

    if (typeof input.isInstructor !== "boolean") {
      throw new ValidationException([new ValidationError("people.isInstructor.invalid")]);
    }

    // An id that isn't a UUID can't name anyone (and the database would refuse to compare it).
    const user = UUID_PATTERN.test(input.userId)
      ? await this.userRepository.findById(input.userId)
      : null;
    if (!user) {
      throw new NotFoundError("user.notFound");
    }
    if (user.status !== "approved") {
      throw new ConflictError("user.status.notApproved");
    }
    if (user.role !== "admin") {
      throw new ConflictError("people.isInstructor.notAdmin");
    }

    const changed = user.clone({ isInstructor: input.isInstructor });
    changed.validate();

    const result = await this.userRepository.updateKeepingAnAdmin(changed, {
      role: "admin",
      status: "approved",
    });
    if (result !== "updated") {
      throw new ConflictError("user.role.changeNotAllowed");
    }

    return { id: user.id, isInstructor: input.isInstructor };
  }
}
