import {
  ConflictError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { UserStatus } from "../model";
import { UserRepository } from "../provider";
import {
  findPendingRegistration,
  REGISTRATION_NOT_PENDING,
} from "./pending-registration";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface DenyRegistrationIn {
  actor: RegistrationActor;
  registrationId: string;
  /** Typed `unknown` because it comes straight from the request body. */
  reason?: unknown;
}

export interface DenyRegistrationOut {
  id: string;
  status: UserStatus;
}

export class DenyRegistration implements UseCase<
  DenyRegistrationIn,
  DenyRegistrationOut
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: DenyRegistrationIn): Promise<DenyRegistrationOut> {
    assertCanDecideRegistrations(input.actor);

    const user = await findPendingRegistration(
      this.userRepository,
      input.registrationId,
    );

    const denied = user.clone({
      status: "denied",
      denialReason: this.toReason(input.reason),
      deniedAt: this.clock.now(),
    });
    denied.validate();

    if (!(await this.userRepository.updateIfPending(denied))) {
      throw new ConflictError(REGISTRATION_NOT_PENDING);
    }

    return { id: denied.id, status: denied.status };
  }

  private toReason(reason: unknown): string | undefined {
    if (reason === undefined || reason === null) return undefined;
    if (typeof reason !== "string") {
      throw new ValidationException([
        new ValidationError("registration.reason.invalid"),
      ]);
    }

    return reason.trim() || undefined;
  }
}
