import {
  ConflictError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ReactivationNotifier, UserRepository } from "../provider";
import {
  findReactivationRequest,
  REACTIVATION_NOT_REQUESTED,
} from "./reactivation-request";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface DenyReactivationIn {
  actor: RegistrationActor;
  userId: string;
  /** Typed `unknown` because it comes straight from the request body. */
  reason?: unknown;
}

export interface DenyReactivationOut {
  id: string;
  decision: "denied";
}

/** Keeps a deleted account deleted, with an optional message the person reads; a denial is final. */
export class DenyReactivation implements UseCase<
  DenyReactivationIn,
  DenyReactivationOut
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly reactivationNotifier: ReactivationNotifier,
  ) {}

  async execute(input: DenyReactivationIn): Promise<DenyReactivationOut> {
    assertCanDecideRegistrations(input.actor);

    const user = await findReactivationRequest(this.userRepository, input.userId);

    const reason = this.toReason(input.reason);
    const denied = user.clone({ reactivationStatus: "denied", denialReason: reason });
    denied.validate();

    if (!(await this.userRepository.updateIfReactivationRequested(denied))) {
      throw new ConflictError(REACTIVATION_NOT_REQUESTED);
    }

    await this.reactivationNotifier.reactivationDenied(denied.id, reason);

    return { id: denied.id, decision: "denied" };
  }

  private toReason(reason: unknown): string | undefined {
    if (reason === undefined || reason === null) return undefined;
    if (typeof reason !== "string") {
      throw new ValidationException([
        new ValidationError("reactivation.reason.invalid"),
      ]);
    }

    return reason.trim() || undefined;
  }
}
