import { ConflictError, UseCase } from "@rochas-surf-school/shared";
import { ReactivationNotifier, UserRepository } from "../provider";
import {
  findReactivationRequest,
  REACTIVATION_NOT_REQUESTED,
} from "./reactivation-request";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface ApproveReactivationIn {
  actor: RegistrationActor;
  userId: string;
}

export interface ApproveReactivationOut {
  id: string;
  decision: "approved";
}

/** Brings a deleted account back with its role and history; the seats cancelled at deletion stay cancelled. */
export class ApproveReactivation implements UseCase<
  ApproveReactivationIn,
  ApproveReactivationOut
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly reactivationNotifier: ReactivationNotifier,
  ) {}

  async execute(input: ApproveReactivationIn): Promise<ApproveReactivationOut> {
    assertCanDecideRegistrations(input.actor);

    const user = await findReactivationRequest(this.userRepository, input.userId);

    // The request is answered, so a new deletion can send a new one.
    const approved = user.clone({
      status: "approved",
      deletedAt: null,
      reactivationStatus: undefined,
      reactivationRequestedAt: undefined,
    });
    approved.validate();

    if (!(await this.userRepository.updateIfReactivationRequested(approved))) {
      throw new ConflictError(REACTIVATION_NOT_REQUESTED);
    }

    await this.reactivationNotifier.reactivationApproved(approved.id);

    return { id: approved.id, decision: "approved" };
  }
}
